import unittest
import numpy as np
import pandas as pd
from feature_engineering import hourly_features
from main import PredictionRequest, refined_features_for, calibrate


class RefinedFeatureTests(unittest.TestCase):
    def make_history(self):
        rng = np.random.default_rng(44)
        index = pd.date_range('2025-01-01', periods=500, freq='h')
        h = pd.DataFrame(index=index)
        h['events'] = rng.integers(0, 50, len(h))
        h['alarms'] = (rng.random(len(h)) > .8).astype(int)
        h['events'] = h.events + h.alarms
        h['active_channels'] = 1
        h['numeric_count'] = h.events
        h['sensor_mean'] = rng.normal(20, 2, len(h))
        h['sensor_min'] = h.sensor_mean - 2
        h['sensor_max'] = h.sensor_mean + 2
        h['fire_alarms'] = h.alarms
        return h

    def test_batch_and_online_features_match(self):
        history = self.make_history()
        expected = hourly_features(history, 5122, 'controlHouse').iloc[-1]
        rows = []
        for at, row in history.tail(168).iterrows():
            rows.append(dict(recordedAt=at.tz_localize('Europe/Moscow').isoformat(), **row.to_dict()))
        request = PredictionRequest(systemObjectId=5122, dispatcherName='Test', objectKind='controlHouse',
            timestamp=(history.index[-1]+pd.Timedelta(minutes=59)).tz_localize('Europe/Moscow').isoformat(),
            historyStart=history.index[0].tz_localize('Europe/Moscow').isoformat(), hourly=rows)
        actual = refined_features_for(request).iloc[0]
        for key in expected.index:
            if isinstance(expected[key], str): self.assertEqual(actual[key], expected[key])
            else: np.testing.assert_allclose(actual[key], expected[key], rtol=1e-5, equal_nan=True, err_msg=key)

    def test_features_are_causal(self):
        history = self.make_history()
        original = hourly_features(history, 1, 'test').iloc[100]
        history.iloc[101:] = 999999
        changed = hourly_features(history, 1, 'test').iloc[100]
        pd.testing.assert_series_equal(original, changed)

    def test_calibration_formula(self):
        self.assertAlmostEqual(calibrate(.5, {'method':'sigmoid','coef':1,'intercept':0}), .5)
        self.assertAlmostEqual(calibrate(.4, {'method':'isotonic','x':[0,.5,1],'y':[0,.25,1]}), .2)
        self.assertEqual(calibrate(.2, {'method':'identity'}), .2)


if __name__ == '__main__': unittest.main()
