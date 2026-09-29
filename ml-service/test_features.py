import math
import os
import unittest
from fastapi.testclient import TestClient
from main import app, features_for, PredictionRequest


def payload():
    return dict(systemObjectId=5122, dispatcherName='Test', objectKind='controlHouse',
        timestamp='2026-08-01T12:30:00+03:00', historyStart='2026-07-30T00:00:00+03:00',
        channels=[dict(channelId=1, sensorName='Temperature', readings=[
            dict(recordedAt='2026-08-01T11:00:00+03:00', numericValue=10, isAlarm=False),
            dict(recordedAt='2026-08-01T11:20:00+03:00', numericValue=20, isAlarm=True),
            dict(recordedAt='2026-08-01T12:10:00+03:00', numericValue=30, isAlarm=False),
            dict(recordedAt='2026-08-01T12:50:00+03:00', numericValue=999, isAlarm=True),
        ])])


class FeaturesTest(unittest.TestCase):
    def test_hourly_training_semantics_and_no_future_leak(self):
        frame = features_for(PredictionRequest(**payload())).iloc[0]
        self.assertEqual(frame.events_1h, 1)
        self.assertEqual(frame.events_24h, 3)
        self.assertEqual(frame.alarms_24h, 1)
        self.assertEqual(frame.sensor_mean_6h, 22.5)  # mean of hourly means, not raw mean
        self.assertAlmostEqual(frame.active_channels_6h_mean, 2 / 6)
        self.assertAlmostEqual(frame.sensor_std_6h, math.sqrt(112.5))
        self.assertTrue(math.isnan(frame.sensor_std_1h))
        self.assertEqual(frame.hour, 12)
        self.assertEqual(frame.weekday, 5)

    def test_short_history_uses_training_min_periods(self):
        body = payload()
        body['historyStart'] = '2026-08-01T11:00:00+03:00'
        frame = features_for(PredictionRequest(**body)).iloc[0]
        self.assertEqual(frame.active_channels_24h_mean, 1)

    def test_empty_data_is_not_a_healthy_prediction(self):
        body = payload()
        body['channels'][0]['readings'] = []
        with self.assertRaises(ValueError): features_for(PredictionRequest(**body))

    @unittest.skipUnless(os.environ.get('MODEL_DIR'), 'Set MODEL_DIR for real model test')
    def test_real_model_contract_and_validation(self):
        with TestClient(app) as client:
            body = payload()
            body['hourly'] = [dict(recordedAt='2026-08-01T11:00:00+03:00', events=2,
                alarms=1, active_channels=1, numeric_count=2, sensor_mean=15, sensor_min=10, sensor_max=20),
                dict(recordedAt='2026-08-01T12:00:00+03:00', events=1, alarms=0,
                active_channels=1, numeric_count=1, sensor_mean=30, sensor_min=30, sensor_max=30)]
            response = client.post('/predict', json=body)
            self.assertEqual(response.status_code, 200, response.text)
            result = response.json()
            self.assertTrue(0 <= result['probability'] <= 100)
            self.assertEqual(result['horizonHours'], 24)
            self.assertEqual(result['calibrated'], client.get('/health').json()['calibrated'])
            self.assertEqual(result['isIncidentPredicted'], result['probability'] >= result['threshold'])
            invalid = payload(); invalid['timeHorizonHours'] = 2
            self.assertEqual(client.post('/predict', json=invalid).status_code, 422)
            invalid = payload(); invalid['timestamp'] = '2026-08-01T12:30:00'
            self.assertEqual(client.post('/predict', json=invalid).status_code, 422)


if __name__ == '__main__': unittest.main()
