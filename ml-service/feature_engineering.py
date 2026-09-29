"""Versioned, causal feature definitions shared by offline training and inference.

Each row represents a completed hourly bucket. No target/future columns are read.
The online caller may include a partial last bucket; metadata discloses that caveat.
"""
import numpy as np
import pandas as pd

FEATURE_VERSION = "hourly_v2_168h"
HISTORY_HOURS = 168
GROUPS = ("fire", "flood", "pump", "security", "temperature")
COUNTS = ("events", "alarms", "active_channels", "numeric_count") + tuple(f"{g}_alarms" for g in GROUPS)


def hourly_features(hourly: pd.DataFrame, object_id: int, object_kind: str) -> pd.DataFrame:
    """Input is a gap-filled, sorted hourly index in Moscow wall time."""
    if not hourly.index.is_monotonic_increasing or not hourly.index.is_unique:
        raise ValueError("Hourly index must be increasing and unique")
    if len(hourly) > 1 and not (hourly.index.to_series().diff().iloc[1:] == pd.Timedelta(hours=1)).all():
        raise ValueError("Fill missing hourly buckets before generating features")
    h = hourly.copy()
    for column in COUNTS:
        if column not in h: h[column] = 0.0
        h[column] = h[column].fillna(0)
    for column in ("sensor_mean", "sensor_min", "sensor_max", "sensor_std"):
        if column not in h: h[column] = np.nan
    features = {}
    for window in (1, 3, 6, 12, 24, 72, 168):
        for column in ("events", "alarms", "numeric_count") + tuple(f"{g}_alarms" for g in GROUPS):
            features[f"{column}_{window}h"] = h[column].rolling(window, min_periods=1).sum()
        features[f"active_channels_{window}h_mean"] = h.active_channels.rolling(window, min_periods=1).mean()
        features[f"sensor_mean_{window}h"] = h.sensor_mean.rolling(window, min_periods=1).mean()
        features[f"sensor_min_{window}h"] = h.sensor_min.rolling(window, min_periods=1).min()
        features[f"sensor_max_{window}h"] = h.sensor_max.rolling(window, min_periods=1).max()
        features[f"sensor_std_{window}h"] = h.sensor_mean.rolling(window, min_periods=1).std()
        features[f"alarm_rate_{window}h"] = features[f"alarms_{window}h"] / features[f"events_{window}h"].clip(lower=1)
        features[f"active_hours_{window}h"] = (h.events > 0).rolling(window, min_periods=1).sum()
        features[f"alarm_hours_{window}h"] = (h.alarms > 0).rolling(window, min_periods=1).sum()
    for column in ("events", "alarms"):
        for lag in (1, 6, 24):
            features[f"{column}_lag_{lag}h"] = h[column].shift(lag)
        features[f"{column}_recent_ratio"] = features[f"{column}_6h"] / (features[f"{column}_24h"] / 4 + 1)
        features[f"{column}_week_ratio"] = features[f"{column}_24h"] / (features[f"{column}_168h"] / 7 + 1)
    for column in ("alarms",) + tuple(f"{g}_alarms" for g in GROUPS):
        position = pd.Series(np.arange(len(h), dtype=float), index=h.index)
        last = position.where(h[column] > 0).ffill()
        features[f"hours_since_{column}"] = (position - last).clip(upper=168).fillna(168)
    features["temperature_change_6h"] = features["sensor_mean_1h"] - features["sensor_mean_6h"]
    features["hour"] = h.index.hour
    features["weekday"] = h.index.dayofweek
    features["month"] = h.index.month
    features["is_weekend"] = (h.index.dayofweek >= 5).astype(int)
    features["hour_sin"] = np.sin(2 * np.pi * h.index.hour / 24)
    features["hour_cos"] = np.cos(2 * np.pi * h.index.hour / 24)
    features["day_of_year_sin"] = np.sin(2 * np.pi * h.index.dayofyear / 365.25)
    features["day_of_year_cos"] = np.cos(2 * np.pi * h.index.dayofyear / 365.25)
    features["object_id_cat"] = str(object_id)
    features["вид_объекта"] = str(object_kind)
    result = pd.DataFrame(features, index=h.index)
    numeric = result.select_dtypes(include="number").columns
    result[numeric] = result[numeric].astype('float32')
    return result
