"""Single-snapshot v2 inference equivalent to the immutable batch feature code."""
import numpy as np
import pandas as pd
from feature_engineering import COUNTS, GROUPS


def latest_hourly_features(h, object_id, object_kind):
    if h.empty or not h.index.is_monotonic_increasing or not h.index.is_unique:
        raise ValueError('Hourly index must be nonempty, increasing and unique')
    if len(h)>1 and not (h.index.to_series().diff().iloc[1:]==pd.Timedelta(hours=1)).all():
        raise ValueError('Fill missing hourly buckets before generating features')
    counts={c:np.nan_to_num(h[c].to_numpy(dtype=float),nan=0) if c in h else np.zeros(len(h)) for c in COUNTS}
    numeric={c:h[c].to_numpy(dtype=float) if c in h else np.full(len(h),np.nan)
             for c in ['sensor_mean','sensor_min','sensor_max']}
    f={}
    for window in [1,3,6,12,24,72,168]:
        for c in ['events','alarms','numeric_count']+[g+'_alarms' for g in GROUPS]:
            f[f'{c}_{window}h']=counts[c][-window:].sum()
        f[f'active_channels_{window}h_mean']=counts['active_channels'][-window:].mean()
        for c,operation in [('sensor_mean',np.mean),('sensor_min',np.min),('sensor_max',np.max)]:
            values=numeric[c][-window:]; values=values[~np.isnan(values)]
            f[f'{c}_{window}h']=operation(values) if len(values) else np.nan
        values=numeric['sensor_mean'][-window:]; values=values[~np.isnan(values)]
        f[f'sensor_std_{window}h']=values.std(ddof=1) if len(values)>1 else np.nan
        f[f'alarm_rate_{window}h']=f[f'alarms_{window}h']/max(f[f'events_{window}h'],1)
        f[f'active_hours_{window}h']=np.count_nonzero(counts['events'][-window:]>0)
        f[f'alarm_hours_{window}h']=np.count_nonzero(counts['alarms'][-window:]>0)
    for c in ['events','alarms']:
        for lag in [1,6,24]: f[f'{c}_lag_{lag}h']=counts[c][-lag-1] if len(h)>lag else np.nan
        f[f'{c}_recent_ratio']=f[f'{c}_6h']/(f[f'{c}_24h']/4+1)
        f[f'{c}_week_ratio']=f[f'{c}_24h']/(f[f'{c}_168h']/7+1)
    for c in ['alarms']+[g+'_alarms' for g in GROUPS]:
        locations=np.flatnonzero(counts[c]>0)
        f[f'hours_since_{c}']=min(len(h)-1-locations[-1],168) if len(locations) else 168
    at=h.index[-1]
    f.update(temperature_change_6h=f['sensor_mean_1h']-f['sensor_mean_6h'],hour=at.hour,weekday=at.dayofweek,
        month=at.month,is_weekend=int(at.dayofweek>=5),hour_sin=np.sin(2*np.pi*at.hour/24),hour_cos=np.cos(2*np.pi*at.hour/24),
        day_of_year_sin=np.sin(2*np.pi*at.dayofyear/365.25),day_of_year_cos=np.cos(2*np.pi*at.dayofyear/365.25))
    frame=pd.DataFrame([{k:np.float32(v) for k,v in f.items()}])
    frame['object_id_cat']=str(object_id); frame['вид_объекта']=str(object_kind)
    return frame
