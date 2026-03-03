# CLAUDE.md — TrueRoute Project Instructions

## What Is This Project?

TrueRoute is an Android navigation app that detects GPS spoofing and switches to dead reckoning using OBD2 vehicle speed + phone IMU sensors. Built for Ukrainian drivers who lose GPS during electronic warfare / air raids. No consumer solution exists — military INS costs $10k+, TrueRoute does it with any Android phone + a $10 Bluetooth OBD2 adapter.

## Architecture Summary

- **Kotlin Multiplatform (KMP)** — all algorithms in `shared/src/commonMain/`, platform code in `androidMain`
- **5-state Extended Kalman Filter** — state: `[lat, lng, speed, heading, yaw_rate]`
- **4 sensor inputs** — GPS (1Hz), OBD2 via Bluetooth ELM327 (5-10Hz), IMU gyro/accel (50-100Hz), compass
- **Spoof detection** — weighted score from 4 sub-detectors, thresholds trigger mode switch
- **Dead reckoning** — OBD2 speed + gyro heading propagate position when GPS untrusted
- **Offline-first** — MapLibre + OSM .mbtiles, no server dependency for any core feature
- **V1 routing** — GPX file import only (no in-app route calculation)
- **V2 planned** — Valhalla-Mobile offline routing, iOS target, maplibre-compose migration

## Tech Stack

- Kotlin 2.1+, Gradle 8+, AGP 8+
- Android SDK 26+ (API 26 minimum — needed for GNSS raw measurements)
- Jetpack Compose for UI
- MapLibre GL Native 11.11.0 via raw `AndroidView` wrapper (NOT maplibre-compose, it's unstable)
- kotlinx.coroutines + Flow for async
- kotlinx.serialization for JSON
- Mokkery 3.1.1 for test mocking (NOT MockK — it's JVM-only, breaks KMP)
- Turbine 1.2.0 for Flow testing
- No DI framework in shared module — manual constructor injection (ADR-005)
- Android app layer can use Koin for UI wiring

## Project Structure

```
shared/
  src/
    commonMain/kotlin/com/trueroute/
      model/          # Position, StateVector, SensorReading, ObdReading, etc.
      math/           # GeoMath (haversine, bearing), Matrix (5x5 ops)
      config/         # TrueRouteConfig data class
      obd/            # Elm327Protocol, ObdPidDefinitions, ObdDataStream
      fusion/         # KalmanFilter, SensorFusionEngine, HeadingEstimator, NoiseModel
      spoof/          # 4 sub-detectors, SpoofDetector orchestrator, SpoofConfidence
      deadreckoning/  # DeadReckoningEngine, SpeedSource
      nav/            # NavigationEngine, GPX parser, route following
    commonTest/kotlin/com/trueroute/   # All tests mirror source structure
    androidMain/kotlin/com/trueroute/
      sensor/         # AndroidSensorProvider, AndroidLocationProvider
      bluetooth/      # AndroidBluetoothProvider
      service/        # NavigationForegroundService
androidApp/
  src/main/kotlin/com/trueroute/
    ui/               # Compose screens: Map, Diagnostics, Settings, Setup Wizard
    viewmodel/        # ViewModels bridging shared logic to UI
    di/               # Koin modules (Android only)
docs/
  plans/              # Milestone implementation plans (m1-foundation.md, etc.)
```

## Build & Test Commands

```bash
./gradlew :shared:build              # Compile shared module
./gradlew :shared:allTests           # Run all shared tests (JVM + Android)
./gradlew ktlintCheck                # Lint check
./gradlew :androidApp:assembleDebug  # Build Android APK
```

## Milestones (Implementation Order)

| # | Name | Core Deliverables |
|---|------|-------------------|
| M1 | Foundation | Data models, GeoMath, Matrix, Config, project skeleton + Gradle |
| M2 | OBD2 | Elm327Protocol, PID parsing, BluetoothProvider, ObdDataStream |
| M3 | Sensor Fusion | KalmanFilter (EKF), SensorFusionEngine, HeadingEstimator, NoiseModel |
| M4 | Spoof Detection | 4 sub-detectors, SpoofDetector, SpoofConfidence, hysteresis |
| M5 | Dead Reckoning | DeadReckoningEngine, SpeedSource, mode switching integration |
| M6 | Android UI + Nav | MapLibre wrapper, screens, foreground service, GPX import, NavigationEngine |

Detailed task plans live in `docs/plans/m{N}-{name}.md`. Reference them with `@docs/plans/m1-foundation.md` when starting work on a milestone.

## Key Conventions

### Units and Math
- **All internal math uses radians**, not degrees. Convert at boundaries only.
- **Coordinates**: lat/lng in decimal degrees (WGS84) in data models, radians in EKF internals.
- **Speed**: meters/second internally. Convert to km/h only at UI layer.
- **Heading**: 0 = North, clockwise, in radians internally.
- **Haversine** for distance, initial bearing formula for heading between points.

### Code Style
- One file = one public class/interface. File name matches class name.
- Every source file gets a paired test file. Tests ship with the code, not as a separate phase.
- All components behind interfaces — enables testing with Mokkery mocks.
- Pure functions where possible — no suspend in math/algorithm code.
- `data class` for models, no logic in models (except computed properties).
- Use Kotlin `Flow` for sensor streams, not callbacks.

### EKF Specifics
- 5×5 matrices — custom `Matrix.kt`, no external linear algebra library.
- Prediction at 20Hz, GPS measurement update at 1Hz, OBD2 at 5-10Hz, gyro at 50Hz.
- **NaN guard**: if any state element becomes NaN, reset EKF to last known good state.
- Process noise Q: `diag([σ²_lat, σ²_lng, σ²_speed, σ²_heading, σ²_yaw_rate])`
- Starting Q values: σ_lat = σ_lng = 0.00001° (~1m), σ_speed = 0.5 m/s, σ_heading = 0.02 rad, σ_yaw_rate = 0.01 rad/s

### Spoof Detection Scoring
```
score = 0.35 × position_jump + 0.30 × speed_mismatch + 0.20 × heading_mismatch + 0.15 × gnss_anomaly

> 0.6 → POSSIBLE_SPOOF (warning)
> 0.8 → SPOOF_DETECTED (switch to dead reckoning)
< 0.3 for 30s → GPS_TRUSTED (switch back)
```

### OBD2 Protocol
- ELM327 AT commands over Bluetooth SPP (RFCOMM)
- Primary PID: 0x0D (vehicle speed) — `A` = km/h directly
- Secondary: 0x0C (RPM) = `(256A + B) / 4`, 0x04 (engine load) = `A × 100 / 255`
- Init sequence: ATZ → ATE0 → ATL0 → ATS0 → ATH0 → ATSP0 → 0100
- Timeout per command: 2000ms. Connection timeout: 10000ms. Reconnect: 3 attempts, 5s delay.

## What NOT To Do

- **Do NOT add MockK** — use Mokkery. MockK is JVM-only and breaks commonTest.
- **Do NOT add a DI framework** to the shared module. Manual constructor injection only.
- **Do NOT use maplibre-compose** — use raw AndroidView wrapper. The library is unstable (v0.11.1).
- **Do NOT add routing/pathfinding** in V1. Route following from GPX only. Valhalla-Mobile is V2.
- **Do NOT use external linear algebra libraries** — custom 5×5 Matrix class is sufficient.
- **Do NOT persist EKF state** — it's session-only, in-memory.
- **Do NOT use SharedPreferences directly in commonMain** — abstract behind an interface with `expect/actual`.
- **Do NOT compute routes** — V1 imports GPX files. Users can create routes in Organic Maps and export.
- **Do NOT add network calls for core features** — everything works offline.
- **Do NOT use `Double.NaN` comparisons with `==`** — always use `isNaN()`.

## Configuration Reference

All tunable parameters live in `TrueRouteConfig.kt` as a data class with defaults. Key values:

- EKF prediction: 20Hz | IMU collection: 50Hz | OBD2 polling: 10Hz
- Complementary filter α: 0.98 (gyro weight vs compass)
- Position jump multiplier: 3.0× (max expected distance = speed × dt × multiplier)
- Speed mismatch threshold: 15 km/h sustained for 3s
- Heading mismatch threshold: 30° when speed > 10 km/h

Users adjust thresholds via Settings screen. Config serialized to SharedPreferences.

## Dependency Versions (libs.versions.toml)

```toml
kotlin = "2.1.20"
agp = "8.7.3"
compose-bom = "2025.12.00"
coroutines = "1.10.1"
serialization = "1.10.0"
maplibre = "11.11.0"
lifecycle = "2.8.7"
navigation = "2.8.5"
turbine = "1.2.0"
mokkery = "3.1.1"
```

## Graceful Degradation (Critical Design Principle)

The app never crashes and never shows "nothing". Sensor availability determines mode:

| GPS | OBD2 | IMU | Mode |
|-----|------|-----|------|
| ✓ | ✓ | ✓ | Full fusion (best accuracy) |
| ✓ | ✗ | ✓ | GPS + IMU (no speed cross-check, weaker spoof detection) |
| ✗ | ✓ | ✓ | Dead reckoning (OBD2 speed + gyro heading) |
| ✗ | ✗ | ✓ | IMU-only DR (accelerometer speed — high drift, last resort) |
| ✓ | ✗ | ✗ | GPS only (no spoof detection, standard nav) |

Always provide the best positioning available with whatever sensors are working.

## Reference Documents

- `docs/TrueRoute-SRS.md` — Full requirements, user stories, acceptance criteria
- `docs/TrueRoute-Architecture.md` — Architecture doc with C4 diagrams, ADRs, component details
- `docs/plans/m{N}-{name}.md` — Per-milestone implementation plans with task-level detail
