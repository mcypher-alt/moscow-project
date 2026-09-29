"""Causal long-history and weekly-analogue features; v2 remains immutable."""
import numpy as np
import pandas as pd
from feature_engineering import hourly_features as v2_features, GROUPS

FEATURE_VERSION = 'hourly_v3_720h'
HISTORY_HOURS = 720


def hourly_features(hourly, object_id, object_kind):
    base = v2_features(hourly, object_id, object_kind)
    h = hourly.copy()
    cols = ['events', 'alarms', 'active_channels', 'numeric_count'] + [g+'_alarms' for g in GROUPS]
    for col in cols:
        if col not in h: h[col] = 0.
        h[col] = h[col].fillna(0)
    extra = {}
    for col in ['events','alarms'] + [g+'_alarms' for g in GROUPS]:
        for window in [336,672]:
            extra[f'{col}_{window}h'] = h[col].rolling(window,min_periods=1).sum()
        day = h[col].rolling(24,min_periods=1).sum()
        analogues = []
        for week in [1,2,3,4]:
            # At t, use t-168w+1 ... t-168w+24. All observations are in the past.
            analogue = day.shift(week*168-24)
            extra[f'{col}_next_day_week{week}'] = analogue
            analogues.append(analogue)
        extra[f'{col}_weekly_analogue_mean'] = pd.concat(analogues,axis=1).mean(axis=1)
        extra[f'{col}_month_ratio'] = base[f'{col}_24h'] / (extra[f'{col}_672h']/28+1)
    trailing_outcome = (h.alarms.rolling(24,min_periods=1).sum()>0).astype(float)
    for window in [168,672]:
        extra[f'observed_alarm_day_rate_{window}h'] = trailing_outcome.rolling(window,min_periods=1).mean()
    for window in [336,672]:
        extra[f'alarm_hours_{window}h'] = (h.alarms>0).rolling(window,min_periods=1).sum()
        extra[f'active_hours_{window}h'] = (h.events>0).rolling(window,min_periods=1).sum()
        extra[f'alarm_rate_{window}h'] = extra[f'alarms_{window}h']/extra[f'events_{window}h'].clip(lower=1)
        extra[f'active_channels_{window}h_mean'] = h.active_channels.rolling(window,min_periods=1).mean()
    extra['weekday_next_day'] = (h.index.dayofweek+1)%7
    extra['hour_of_week'] = h.index.dayofweek*24+h.index.hour
    extra['object_weekday_cat'] = [f'{object_id}_{d}' for d in h.index.dayofweek]
    extra['object_weekhour_cat'] = [f'{object_id}_{d}_{hour//3}' for d,hour in zip(h.index.dayofweek,h.index.hour)]
    result = pd.concat([base,pd.DataFrame(extra,index=h.index)],axis=1)
    numeric = result.select_dtypes(include='number').columns
    result[numeric] = result[numeric].astype('float32')
    return result
