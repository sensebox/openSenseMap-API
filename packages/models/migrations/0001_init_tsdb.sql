-- This is a custom SQL migration file! --

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Turn the measurement table into a hypertable
SELECT create_hypertable('measurement', 'time');

-- Drop raw data older than 1 year
SELECT add_retention_policy('measurement', INTERVAL '1 year');

-- Continuous aggregate (CAGG) of the hypertable
-- https://docs.timescale.com/use-timescale/latest/continuous-aggregates/real-time-aggregates/
CREATE MATERIALIZED VIEW measurement_10min WITH (timescaledb.continuous) AS
SELECT measurement.sensor_id,
       time_bucket('10 minutes', measurement.time) AS time,
       COUNT(*) total_values,
       AVG(measurement.value) AS avg_value,
       percentile_agg(measurement.value) as percentile_10min,
       MAX(measurement.value) AS max_value,
       MIN(measurement.value) AS min_value
FROM measurement
GROUP BY 1, 2
WITH NO DATA;

-- Add a CAGG policy in order to refresh it automatically
-- Automatically keep downsampled data up to date with new data from 20 minutes to 2 days ago.
-- https://docs.timescale.com/use-timescale/latest/continuous-aggregates/drop-data/
SELECT add_continuous_aggregate_policy('measurement_10min',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '10 minutes',
  schedule_interval => INTERVAL '10 minutes'
);

-- Continuous aggregate (CAGG) of the hypertable
-- https://docs.timescale.com/use-timescale/latest/continuous-aggregates/real-time-aggregates/
CREATE MATERIALIZED VIEW measurement_1hour WITH (timescaledb.continuous) AS
SELECT sensor_id,
       time_bucket('1 hour', time) AS time,
       COUNT(*) total_values,
       mean(rollup(percentile_10min)) AS avg_value,
       rollup(percentile_10min) as percentile_1hour,
       MAX(max_value) AS max_value,
       MIN(min_value) AS min_value
FROM measurement_10min
GROUP BY 1, 2
WITH NO DATA;

SELECT add_continuous_aggregate_policy('measurement_1hour',
  start_offset => INTERVAL '2 days',
  end_offset => INTERVAL '3 minutes',
  schedule_interval => INTERVAL '1 hour',
  initial_start => date_trunc('hours', now() + INTERVAL '1 hour') + INTERVAL '5 minutes'
);

-- Continuous aggregate (CAGG) on top of another CAGG / Hierarchical Continuous Aggregates , new in Timescale 2.9, issue with TZ as of https://github.com/timescale/timescaledb/pull/5195
-- https://docs.timescale.com/use-timescale/latest/continuous-aggregates/real-time-aggregates/
CREATE MATERIALIZED VIEW measurement_1day WITH (timescaledb.continuous) AS
SELECT sensor_id,
       time_bucket('1 day', time) AS time,
       COUNT(*) total_values,
       mean(rollup(percentile_1hour)) AS avg_value,
       rollup(percentile_1hour) as percentile_1day,
       MAX(max_value) AS max_value,
       MIN(min_value) AS min_value
FROM measurement_1hour
GROUP BY 1, 2
WITH NO DATA;

-- Add a CAGG policy in order to refresh it automatically
-- Automatically keep downsampled data up to date with new data from 2 days to 4 days ago.
-- https://docs.timescale.com/use-timescale/latest/continuous-aggregates/drop-data/
SELECT add_continuous_aggregate_policy('measurement_1day',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '3 minutes',
  schedule_interval => INTERVAL '1 day',
  initial_start => date_trunc('day', now() + INTERVAL '1 day') + INTERVAL '5 minutes'
);

CREATE MATERIALIZED VIEW measurement_1month WITH (timescaledb.continuous) AS
SELECT sensor_id,
       time_bucket('1 month', time) AS time,
       COUNT(*) total_values,
       mean(rollup(percentile_1day)) AS avg_value,
       rollup(percentile_1day) as percentile_1month,
       MAX(max_value) AS max_value,
       MIN(min_value) AS min_value
FROM measurement_1day
GROUP BY 1, 2
WITH NO DATA;

SELECT add_continuous_aggregate_policy('measurement_1month',
  start_offset => INTERVAL '3 months',
  end_offset => INTERVAL '3 minutes',
  schedule_interval => INTERVAL '1 month',
  initial_start => date_trunc('month', now() + INTERVAL '1 month') + INTERVAL '5 minutes'
);

CREATE MATERIALIZED VIEW measurement_1year WITH (timescaledb.continuous) AS
SELECT sensor_id,
       time_bucket('1 year', time) AS time,
       COUNT(*) total_values,
       mean(rollup(percentile_1day)) AS avg_value,
       rollup(percentile_1day) as percentile_1year,
       MAX(max_value) AS max_value,
       MIN(min_value) AS min_value
FROM measurement_1day
GROUP BY 1, 2
WITH NO DATA;

SELECT add_continuous_aggregate_policy('measurement_1year',
  start_offset => INTERVAL '3 years',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 year',
  initial_start => date_trunc('year', now() + INTERVAL '1 year') + INTERVAL '2 hours'
);