import unittest
import numpy as np
import pandas as pd
from fast_features import latest_hourly_features
from feature_engineering import hourly_features,COUNTS


class FastFeaturesTests(unittest.TestCase):
    def test_random_missing_short_and_long_histories(self):
        rng=np.random.default_rng(9)
        for length in [1,2,6,24,25,72,168,720]:
            h=pd.DataFrame(index=pd.date_range('2025-12-31',periods=length,freq='h'))
            for c in COUNTS: h[c]=rng.integers(0,50,length).astype(float)
            for c in ['sensor_mean','sensor_min','sensor_max']:
                h[c]=rng.normal(30,10,length); h.loc[h.index[::3],c]=np.nan
            expected=hourly_features(h,3,'test').iloc[-1]
            actual=latest_hourly_features(h,3,'test').iloc[0]
            self.assertEqual(set(expected.index),set(actual.index))
            for c in expected.index:
                if isinstance(expected[c],str): self.assertEqual(actual[c],expected[c])
                else: np.testing.assert_allclose(actual[c],expected[c],rtol=1e-6,atol=1e-6,equal_nan=True,err_msg=f'{length}:{c}')

    def test_empty_and_gapped_history_rejected(self):
        with self.assertRaises(ValueError): latest_hourly_features(pd.DataFrame(),3,'test')
        h=pd.DataFrame(index=pd.to_datetime(['2025-01-01','2025-01-02']))
        with self.assertRaises(ValueError): latest_hourly_features(h,3,'test')


if __name__=='__main__': unittest.main()
