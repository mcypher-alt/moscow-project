import unittest
import numpy as np
import pandas as pd
from feature_engineering_v3 import hourly_features, HISTORY_HOURS


class LongHistoryTests(unittest.TestCase):
    def history(self, periods=1500):
        rng=np.random.default_rng(73)
        h=pd.DataFrame(index=pd.date_range('2023-01-01',periods=periods,freq='h'))
        h['events']=rng.integers(0,20,periods)
        h['alarms']=(rng.random(periods)<.04).astype(float)
        h['events']+=h.alarms
        h['active_channels']=(h.events>0).astype(float)
        return h

    def test_bounded_history_matches_full_history(self):
        h=self.history()
        full=hourly_features(h,5,'test').iloc[-1]
        bounded=hourly_features(h.tail(HISTORY_HOURS),5,'test').iloc[-1]
        pd.testing.assert_series_equal(full,bounded)

    def test_weekly_analogue_is_previous_weeks_future_window(self):
        h=self.history(900); h['alarms']=0.
        # At hour 800, the previous week's analogous next day is 633..656.
        h.iloc[632,h.columns.get_loc('alarms')]=10
        h.iloc[633,h.columns.get_loc('alarms')]=1
        h.iloc[656,h.columns.get_loc('alarms')]=2
        h.iloc[657,h.columns.get_loc('alarms')]=20
        row=hourly_features(h,5,'test').iloc[800]
        self.assertEqual(row.alarms_next_day_week1,3)

    def test_future_readings_do_not_change_features(self):
        h=self.history()
        before=hourly_features(h,5,'test').iloc[800]
        h.iloc[801:]=9999
        after=hourly_features(h,5,'test').iloc[800]
        pd.testing.assert_series_equal(before,after)

    def test_short_history_does_not_invent_weekly_observations(self):
        row=hourly_features(self.history(10),5,'test').iloc[-1]
        self.assertTrue(np.isnan(row.alarms_next_day_week1))
        self.assertTrue(np.isnan(row.alarms_weekly_analogue_mean))


if __name__=='__main__': unittest.main()
