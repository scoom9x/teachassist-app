# Teach Assist

An unofficial, local-first YRDSB TeachAssist companion built with React, TypeScript, Vite, and Capacitor 8.

## Run

```sh
npm install
npm run dev
npm test
npm run native:sync
npx cap open ios
# or
npx cap open android
```

The iOS and Android projects are included. Use Xcode / Android Studio with the toolchain required by Capacitor 8; configure your own application ID and signing for distribution.

## Features

- Username/password login using the requested HTTPS GET endpoint and URLSearchParams encoding.
- Native HTTP requests and cookies, same-origin redirect handling, positive Student Reports detection, login-form/session-expiry detection, sanitized network errors.
- Optional saved login using the secure-storage plugin: iOS Keychain and Android Keystore-backed encrypted storage. iCloud credential synchronization is disabled. Browser credential storage is explicitly disabled.
- Course cards with current and midterm marks, block/room/date metadata, unavailable reports shown explicitly.
- Course pages with assignment category scores, weights, comments, excluded marks, and category summaries. The course mark is the upstream reported value, not a recalculation.
- Local snapshots, up to 100 course-mark history entries, timestamps, offline browsing, and imported saved HTML files. History is stored but does not yet have a dedicated chart.
- Sign out clears this app's cached grades, saved credentials, and TeachAssist cookie jar. Android backup is disabled.
- Fictional demo data. Private supplied HTML is not bundled or copied into the app.

## Browser preview

Live login is native-only to avoid cross-origin browser restrictions and credential proxying. Run the demo or select **Import saved reports**. Select the main `Student Reports.html` plus individual course HTML files together; imports are parsed locally. The browser preview stores parsed grades in localStorage through Capacitor Preferences, never passwords. Import timestamps indicate when files were imported, not when grades changed.

## Security and behavior

The requested upstream GET protocol places credentials in the request query string. The app does not navigate the WebView to that URL, log it, or persist it, but the upstream server/network tooling can still record URLs. The public upstream form uses POST; consider switching to POST after confirming the desired upstream behavior.

Remote HTML is parsed as data and never inserted into the app or executed. Only HTTPS URLs on `ta.yrdsb.ca` are accepted. Only report links to `/live/students/viewReport.php` become course destinations. HTTP redirects and simple literal script/meta redirects are supported; more complex script-driven login changes need an adapter update.

Grade snapshots are app-private Preferences data on native platforms, not separately encrypted. Secure storage is used only for credentials. The UI uses optional Google Fonts with system fallbacks.

Login and Refresh grades fetch the course listing, then request every available individual report using the authenticated native session. Assignment scores, category breakdowns, and report-level grades are saved locally. Opening a course also refreshes its individual report. A failed report preserves its previous saved details and displays a partial-sync warning. If fetching fails, an existing saved detail remains available with its original timestamp. A successful login to a different student account discards the previous account's cached details/history. Cached offline grades are accessible on this device without reauthentication.

## Verification and remaining device checks

Parser tests cover both synthetic failure/edge cases and the supplied saved pages when the external drive is mounted. External sample tests are skipped elsewhere. Network tests mock login failures, redirects, session expiry, and URL encoding.

No real account credentials were supplied. Successful live GET authentication, cross-request native cookie persistence, secure credential restoration, and signing/building on a real iOS/Android device still require device testing. Do not treat browser demo or mocked tests as native end-to-end validation. If the upstream GET protocol is rejected, verify whether `submit=Login` or POST is required; the implementation intentionally uses the user's requested `submit=login`.

Dependency audit: the test-runner advisory was fixed. Three moderate development-only findings remain in the Capacitor CLI → xcode → uuid chain; the compatible `npm audit fix` did not resolve them. Runtime dependencies were not flagged in that audit. Review the CLI dependency chain before release tooling upgrades.

## Automatic updates, notifications, and widgets

- A saved login opens the last visited page using cached grades, then refreshes reports. Returning to the foreground also refreshes. Manual refresh is available on Dashboard and Grades.
- Settings → Automatic grade refresh controls foreground polling (minimum 5 minutes). Background refresh requires saved credentials, stored separately in iOS Keychain (`AfterFirstUnlockThisDeviceOnly`) or Android Keystore-encrypted preferences. Forgetting the saved login removes background credentials; sign-out also clears widget data.
- iOS uses `BGAppRefreshTask` with best-effort scheduling. Android uses a persisted network-constrained `JobScheduler` job with a minimum 15-minute interval. Battery restrictions, force-quitting, and system scheduling can delay or prevent checks. No five-minute background guarantee is made.
- Native background checks refresh published current/midterm/final course marks. Full assignment reports refresh when the app is open. Only numerical changes against the same account's last successful baseline trigger notifications; first load, unchanged values, and request failures do not. Notifications are generic and require permission.
- iPhone: the `GradeWidget` WidgetKit extension supports small, medium, and large sizes on iOS 17+. Add it from the home-screen widget gallery. The app and extension must be signed by the same team with the `group.ca.local.teachassist` App Group enabled. This requires Apple provisioning support for App Groups. Set a unique matching group and bundle identifiers if distributing under another account.
- Android: add the Course grades widget from the launcher. Resize it to see more courses. Tap the widget to open the app. Widgets show cached marks with a last-refresh timestamp; Privacy blur also hides their marks.
- Widget sharing contains grades only. Passwords are never placed in widget/app-group storage. The application still sends credentials only to TeachAssist; no notification server is used.

Native build checks:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
cd android
./gradlew :app:assembleDebug
```

An unsigned simulator build validates compilation, not App Group provisioning or OS background execution. Validate on signed physical devices: allow notifications, enable polling, add a widget, background the app, check a real grade change, confirm no duplicate notification on unchanged data, and verify sign-out empties widgets and stops jobs.
