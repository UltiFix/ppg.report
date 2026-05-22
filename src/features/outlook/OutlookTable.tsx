import { addDays, eachHourOfInterval, startOfDay } from "date-fns";
import { findValue, NWSWeather } from "../../services/nwsWeather";
import { timeZoneSelector, Weather } from "../weather/weatherSlice";
import { OpenMeteoWeather } from "../../services/openMeteo";
import { useMemo, useState } from "react";
import OutlookRow from "./OutlookRow";
import { compact } from "es-toolkit";
import styled from "@emotion/styled";
import Day from "./Day";
import SunCalc from "suncalc";
import { TZDate } from "@date-fns/tz";
import { useAppSelector } from "../../hooks";
import { speedUnitFormatter } from "../rap/cells/WindSpeed";
import { SpeedUnit } from "../rap/extra/settings/settingEnums";

const Rows = styled.div``;

interface OutlookTableProps {
  weather: Weather;
}

function getOutlook(
  timeZone: string,
  mapFn: (hour: Date, index: number) => React.ReactNode | undefined,
) {
  const hours = eachHourOfInterval({
    start: new Date(),
    end: addDays(new Date(), 7),
  });

  const data = compact(
    hours.map((hour, index) => ({ node: mapFn(hour, index), hour })),
  );

  return Object.entries(
    Object.groupBy(data, ({ hour }) =>
      startOfDay(new TZDate(hour, timeZone)).getTime(),
    ),
  ).map(([timeStr, hours]) => ({
    date: new Date(+timeStr),
    hours: hours!.map(({ node }) => node),
  }));
}

export default function OutlookTable({ weather }: OutlookTableProps) {
  const timeZone = useAppSelector(timeZoneSelector);
  if (!timeZone) throw new Error("timeZone needed");

  const coordinates = useAppSelector((state) => state.weather.coordinates);
  if (!coordinates) throw new Error("coordinates needed");

  const speedUnit = useAppSelector((state) => state.user.speedUnit);
  const [maxWindSpeed, setMaxWindSpeed] = useState<number | undefined>(10);
  const [maxGustSpeed, setMaxGustSpeed] = useState<number | undefined>(12);
  const [daytimeOnly, setDaytimeOnly] = useState(true);

  const rows = useMemo(() => {
    const isNws = "properties" in weather;

    const getRecord = (hour: Date) => {
      if (isNws) {
        const windDirection = findValue(hour, weather.properties.windDirection)?.value;
        const windSpeed = findValue(hour, weather.properties.windSpeed)?.value;
        const windGust = findValue(hour, weather.properties.windGust)?.value;
        const temperature = findValue(hour, weather.properties.temperature)?.value;
        const observations = findValue(hour, weather.properties.weather)?.value;
        const skyCover = findValue(hour, weather.properties.skyCover)?.value;

        if (
          windDirection == null ||
          windSpeed == null ||
          windGust == null ||
          temperature == null ||
          observations == null ||
          skyCover == null
        )
          return;

        return { windDirection, windSpeed, windGust, temperature, observations, skyCover };
      }

      const data = weather.byUnixTimestamp[hour.getTime() / 1_000];
      if (!data) return;
      return {
        windDirection: data.windDirection,
        windSpeed: data.windSpeed,
        windGust: data.windGust,
        temperature: data.temperature,
        observations: data.weather,
        skyCover: data.cloudCover,
      };
    };

    return getOutlook(timeZone, (hour, index) => {
      const record = getRecord(hour);
      if (!record) return;

      if (daytimeOnly) {
        const isDay = SunCalc.getPosition(hour, coordinates.lat, coordinates.lon).altitude > 0;
        if (!isDay) return;
      }

      if (
        maxWindSpeed !== undefined &&
        Math.round(convertKphToDisplaySpeed(record.windSpeed, speedUnit)) > maxWindSpeed
      )
        return;

      if (
        maxGustSpeed !== undefined &&
        Math.round(convertKphToDisplaySpeed(record.windGust, speedUnit)) > maxGustSpeed
      )
        return;

      return (
        <OutlookRow
          key={index}
          hour={hour}
          windDirection={record.windDirection}
          windSpeed={record.windSpeed}
          windGust={record.windGust}
          temperature={record.temperature}
          observations={record.observations}
          skyCover={record.skyCover}
        />
      );
    }).map(({ date, hours }, index) => (
      <Day key={index} date={date} hours={hours} />
    ));
  }, [weather, timeZone, speedUnit, maxWindSpeed, maxGustSpeed, daytimeOnly, coordinates]);

  return (
    <>
      <Controls>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Max sustained wind</span>
          <input
            type="number"
            value={maxWindSpeed ?? ""}
            onChange={(e) => setMaxWindSpeed(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={speedUnitFormatter(speedUnit)}
            style={{ width: 100 }}
          />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Max gust speed</span>
          <input
            type="number"
            value={maxGustSpeed ?? ""}
            onChange={(e) => setMaxGustSpeed(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={speedUnitFormatter(speedUnit)}
            style={{ width: 100 }}
          />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={daytimeOnly}
            onChange={(e) => setDaytimeOnly(e.target.checked)}
          />
          <span>Exclude night hours</span>
        </label>
      </Controls>

      <Rows>{rows}</Rows>
    </>
  );
}

const Controls = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.25rem;
`;

function convertKphToDisplaySpeed(value: number, unit: SpeedUnit) {
  switch (unit) {
    case SpeedUnit.KPH:
      return value;
    case SpeedUnit.Knots:
      return value * 0.539957;
    case SpeedUnit.MPH:
      return value * 0.621371;
    case SpeedUnit.mps:
      return value * 0.277778;
  }
}

