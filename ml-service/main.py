"""Inference only. Feature definitions mirror ml-moscollector/scripts/train.py.

The supplied binary model predicts alarm proxies, not confirmed incident types.
Never silently fall back to mock scores or call an uncalibrated score calibrated.
"""
from contextlib import asynccontextmanager
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path

import pandas as pd
import numpy as np
from feature_engineering import hourly_features, FEATURE_VERSION, COUNTS
from fast_features import latest_hourly_features
from catboost import CatBoostClassifier
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, AwareDatetime


class Reading(BaseModel):
    recordedAt: AwareDatetime
    numericValue: float | None = Field(default=None, allow_inf_nan=False)
    rawValue: str | None = None
    isAlarm: bool


class Channel(BaseModel):
    channelId: int
    systemTag: str = ""
    sensorName: str
    systemType: str = ""
    sensorType: str | None = None
    readings: list[Reading] = Field(max_length=100000)


class HourlyReading(BaseModel):
    recordedAt: AwareDatetime
    events: float = Field(ge=0, allow_inf_nan=False)
    alarms: float = Field(ge=0, allow_inf_nan=False)
    active_channels: float = Field(ge=0, allow_inf_nan=False)
    numeric_count: float = Field(ge=0, allow_inf_nan=False)
    sensor_mean: float | None = Field(default=None, allow_inf_nan=False)
    sensor_min: float | None = Field(default=None, allow_inf_nan=False)
    sensor_max: float | None = Field(default=None, allow_inf_nan=False)
    sensor_std: float | None = Field(default=None, allow_inf_nan=False)
    fire_alarms: float = Field(default=0, ge=0, allow_inf_nan=False)
    flood_alarms: float = Field(default=0, ge=0, allow_inf_nan=False)
    pump_alarms: float = Field(default=0, ge=0, allow_inf_nan=False)
    security_alarms: float = Field(default=0, ge=0, allow_inf_nan=False)
    temperature_alarms: float = Field(default=0, ge=0, allow_inf_nan=False)


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    systemObjectId: int
    dispatcherName: str
    objectKind: str = "__UNKNOWN__"
    timeHorizonHours: int = Field(default=24, ge=24, le=24)
    timestamp: AwareDatetime
    historyStart: AwareDatetime
    channels: list[Channel] = Field(default_factory=list, max_length=20000)
    hourly: list[HourlyReading] = Field(default_factory=list, max_length=168)


def features_for(request: PredictionRequest) -> pd.DataFrame:
    # Source training timestamps are Moscow wall time. Explicit conversion avoids
    # dependence on the host timezone and preserves calendar feature semantics.
    cutoff = pd.Timestamp(request.timestamp).tz_convert("Europe/Moscow").tz_localize(None)
    hour = cutoff.floor("h")
    start = max(hour - pd.Timedelta(hours=23),
                pd.Timestamp(request.historyStart).tz_convert("Europe/Moscow").tz_localize(None).floor("h"))
    if start > hour:
        raise ValueError("historyStart must not follow timestamp")
    rows = []
    for channel in request.channels:
        for reading in channel.readings:
            at = pd.Timestamp(reading.recordedAt).tz_convert("Europe/Moscow").tz_localize(None)
            if start <= at <= cutoff:
                rows.append((at.floor("h"), channel.channelId, reading.isAlarm, reading.numericValue))
    if not rows:
        raise ValueError("No telemetry in the last 24 hourly buckets")
    raw = pd.DataFrame(rows, columns=["hour", "channel", "alarm", "value"])
    raw["value"] = pd.to_numeric(raw["value"], errors="coerce")
    hourly = raw.groupby("hour").agg(events=("channel", "size"), alarms=("alarm", "sum"),
        active_channels=("channel", "nunique"), sensor_mean=("value", "mean"),
        sensor_min=("value", "min"), sensor_max=("value", "max"))
    hourly = hourly.reindex(pd.date_range(start, hour, freq="h"))
    hourly[["events", "alarms", "active_channels"]] = hourly[["events", "alarms", "active_channels"]].fillna(0)
    result = {}
    for window in (1, 6, 24):
        frame = hourly.tail(window)
        result.update({f"events_{window}h": frame.events.sum(),
                       f"alarms_{window}h": frame.alarms.sum(),
                       f"active_channels_{window}h_mean": frame.active_channels.mean(),
                       f"sensor_mean_{window}h": frame.sensor_mean.mean(),
                       f"sensor_min_{window}h": frame.sensor_min.min(),
                       f"sensor_max_{window}h": frame.sensor_max.max(),
                       f"sensor_std_{window}h": frame.sensor_mean.std(ddof=1)})
    result.update(hour=hour.hour, weekday=hour.dayofweek, month=hour.month,
                  is_weekend=int(hour.dayofweek >= 5), object_id_cat=str(request.systemObjectId))
    result["вид_объекта"] = request.objectKind
    return pd.DataFrame([result])


def refined_features_for(request: PredictionRequest) -> pd.DataFrame:
    if not request.hourly:
        raise ValueError('The refined model requires 168-hour aggregate history')
    cutoff = pd.Timestamp(request.timestamp).tz_convert('Europe/Moscow').tz_localize(None)
    hour = cutoff.floor('h')
    start = max(hour - pd.Timedelta(hours=167), pd.Timestamp(request.historyStart).tz_convert('Europe/Moscow').tz_localize(None).floor('h'))
    records = pd.DataFrame([row.model_dump() for row in request.hourly])
    recorded = pd.to_datetime(records.pop('recordedAt'), utc=True).dt.tz_convert('Europe/Moscow').dt.tz_localize(None)
    if not (recorded == recorded.dt.floor('h')).all() or recorded.duplicated().any():
        raise ValueError('Hourly buckets must be unique and aligned to whole hours')
    records.index = pd.DatetimeIndex(recorded)
    if ((records.index < start) | (records.index > hour)).any():
        raise ValueError('Hourly aggregate outside requested feature window')
    if (records['alarms'] > records['events']).any() or (records['numeric_count'] > records['events']).any():
        raise ValueError('Hourly counts are inconsistent')
    records = records.sort_index().reindex(pd.date_range(start, hour, freq='h'))
    for column in records.columns: records[column] = pd.to_numeric(records[column], errors='coerce')
    if records.events.tail(24).sum() <= 0:
        raise ValueError('No telemetry in the last 24 hourly buckets')
    # Only the current snapshot is scored. Batch rolling matrices are unnecessary.
    if os.environ.get('ML_BATCH_FEATURES') == '1':
        return hourly_features(records, request.systemObjectId, request.objectKind).tail(1).reset_index(drop=True)
    return latest_hourly_features(records, request.systemObjectId, request.objectKind)


def calibrate(probability: float, config: dict) -> float:
    if config['method'] == 'sigmoid':
        p = np.clip(probability, 1e-8, 1-1e-8)
        return float(1/(1+np.exp(-np.clip(config['coef']*np.log(p/(1-p))+config['intercept'], -50, 50))))
    if config['method'] == 'isotonic':
        return float(np.interp(probability, config['x'], config['y']))
    return probability


@asynccontextmanager
async def lifespan(app: FastAPI):
    directory = Path(os.environ.get("MODEL_DIR", "/models"))
    model_path = directory / "general_24h.cbm"
    metadata = json.loads((directory / "general_24h.json").read_text(encoding="utf-8"))
    model = CatBoostClassifier()
    model.load_model(str(model_path))
    if model.feature_names_ != metadata["features"] or metadata["horizon_hours"] != 24:
        raise RuntimeError("Model and feature metadata do not match")
    if not 0 <= metadata["threshold"] <= 1:
        raise RuntimeError("Invalid probability threshold")
    app.state.model = model
    app.state.metadata = metadata
    app.state.version = "general_24h:" + hashlib.sha256(model_path.read_bytes()).hexdigest()[:16]
    version = metadata.get('feature_version')
    if version and version != FEATURE_VERSION:
        raise RuntimeError('Unsupported feature version')
    app.state.calibration = {'method': 'identity'}
    if version:
        expected_hash = metadata.get('feature_code_sha256')
        if expected_hash and hashlib.sha256(Path(__file__).with_name('feature_engineering.py').read_bytes()).hexdigest() != expected_hash:
            raise RuntimeError('Feature code does not match the trained model bundle')
        app.state.calibration = json.loads((directory / 'calibration.json').read_text(encoding='utf-8'))
        if app.state.calibration.get('method') not in ('identity', 'sigmoid', 'isotonic'):
            raise RuntimeError('Unsupported calibration method')
        calibration = app.state.calibration
        if calibration['method'] == 'sigmoid' and not all(np.isfinite(calibration[k]) for k in ('coef', 'intercept')):
            raise RuntimeError('Invalid sigmoid calibration')
        if calibration['method'] == 'isotonic':
            x, y = np.asarray(calibration['x']), np.asarray(calibration['y'])
            if (len(x) < 2 or x.shape != y.shape or x.ndim != 1 or
                not np.isfinite(x).all() or not np.isfinite(y).all() or
                not (np.diff(x) > 0).all() or not (np.diff(y) >= 0).all() or
                not ((y >= 0) & (y <= 1)).all()):
                raise RuntimeError('Invalid isotonic calibration')
        # Calibration and metadata are part of prediction provenance, not just tree weights.
        digest = hashlib.sha256(model_path.read_bytes() + (directory/'general_24h.json').read_bytes() + (directory/'calibration.json').read_bytes()).hexdigest()[:16]
        app.state.version = 'refined_24h:' + digest
    yield


app = FastAPI(title="Moskollektor alarm forecast", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "modelVersion": app.state.version, "target": "target_alarm_24h",
            "calibrated": app.state.calibration['method'] != 'identity',
            "featureVersion": app.state.metadata.get('feature_version', 'legacy_24h'),
            "historyHours": app.state.metadata.get('history_hours', 24),
            "metrics": app.state.metadata["test_metrics"]}


@app.post("/predict")
def predict(request: PredictionRequest):
    try:
        frame = refined_features_for(request) if request.hourly or app.state.metadata.get('feature_version') else features_for(request)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    score = float(app.state.model.predict_proba(frame[app.state.metadata["features"]], thread_count=2)[0, 1])
    score = calibrate(score, app.state.calibration)
    threshold = app.state.metadata["threshold"]
    alarms = int(frame.iloc[0]["alarms_24h"])
    events = int(frame.iloc[0]["events_24h"])
    return {"systemObjectId": request.systemObjectId, "evaluatedAt": request.timestamp.isoformat(),
            "isIncidentPredicted": score >= threshold, "probability": score * 100,
            "threshold": threshold * 100, "modelVersion": app.state.version,
            "horizon": "24 часа", "horizonHours": 24,
            "incidentType": "Риск тревожного события (тип не определён)",
            "reason": f"За последние 24 часовых интервала: {events} событий, {alarms} тревожных. "
                      "Модель оценивает будущую тревогу; физическая причина не установлена.",
            "recommendation": "Проверить показания, состояние оборудования и плановые работы. "
                              "Решение о проверке или обслуживании принимает диспетчер.",
            "calibrated": app.state.calibration['method'] != 'identity', "target": "target_alarm_24h"}
