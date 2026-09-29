"""Sensor-specific features preserve temperature units and separate alarm systems."""
import numpy as np
import pandas as pd
from feature_engineering_v3 import hourly_features as long_features, HISTORY_HOURS
FEATURE_VERSION='hourly_v4_720h_typed'
TYPED_COUNTS=('alarm_channels','temperature_count','gas_count','gas_alarms','dispatch_alarms',
    'diagnostic_alarms','smoke_alarms','phase_alarms','fan_alarms','door_alarms','motion_alarms')
TYPED_VALUES=('temperature_mean','temperature_max','temperature_min','gas_mean','gas_max')

def hourly_features(hourly,object_id,object_kind):
    base=long_features(hourly,object_id,object_kind)
    h=hourly.copy(); extra={}
    for col in TYPED_COUNTS:
        values=h[col].fillna(0) if col in h else pd.Series(0.,index=h.index)
        for window in [1,6,24,168,672]:
            extra[f'typed_{col}_{window}h']=values.rolling(window,min_periods=1).sum()
    for col in TYPED_VALUES:
        values=h[col] if col in h else pd.Series(np.nan,index=h.index)
        for window in [1,6,24,168]:
            roll=values.rolling(window,min_periods=1)
            extra[f'typed_{col}_{window}h']=roll.max() if col.endswith('max') else roll.min() if col.endswith('min') else roll.mean()
        extra[f'typed_{col}_change_24h']=extra[f'typed_{col}_1h']-extra[f'typed_{col}_24h']
    return pd.concat([base,pd.DataFrame(extra,index=h.index).astype('float32')],axis=1)
