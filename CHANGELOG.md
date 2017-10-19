# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.2] - 2017-10-19
### Fixed
- Fixed an issue that occur when a pod has no condition (#12, thanks @PanJ)

## [3.0.1] - 2017-08-30
### Added
- Show pod's namespace

## [3.0.0] - 2017-08-30
There are breaking changes in this release. If you are using the more advanced features (including logging URL) please read the chagelog carefully.

### Added
- Check for unready pods. Minimum time for pod to be not ready is controlled by `NOT_READY_MIN_TIME` (defaults to 60000 or 60s)

### Changed
- Rewritten. Now use [kubernetes-client](https://github.com/godaddy/kubernetes-client) instead of kubectl.
  - Flood filter expiration is now controlled by `FLOOD_EXPIRE` (in milliseconds) rather than tick count
- Can now support multiple monitoring conditions and notification systems
  - Notification format changed for future use
- Now default to all namespaces
- Configuration now are read using node-config
- Updated example to use Deployment (#6)

### Removed
- `LOGGING_URL` support

## [2.1.1] - 2016-12-16
### Removed
- Unimportant `console.log`

## [2.1.0] - 2016-12-10
### Added
- `--all-namespaces` argument (#8, thanks to @dylannlaw)

## [2.0.0] - 2016-12-20
### Changed
- **Breaking** Replaced `KIBANA_URL` with `LOGGING_URL`. Use `LOGGING_URL=https://example.com/app/kibana#/discover?_g=()&_a=(columns:!(log,stream),index:'logstash-*',interval:auto,query:(query_string:(analyze_wildcard:!t,query:'kubernetes.pod:%20%POD%%20%26%26%20kubernetes.container_name:%20%CONTAINER%')),sort:!('@timestamp',desc))` for Kibana.

## [1.1.0] - 2016-12-17
### Changed
- Optimized Dockerfile

[Unreleased]: https://github.com/wongnai/kube-slack/compare/v3.0.1...HEAD
[3.0.1]: https://github.com/wongnai/kube-slack/compare/v3.0.1...v3.0.0
[3.0.0]: https://github.com/wongnai/kube-slack/compare/v3.0.0...v2.1.1
[2.1.1]: https://github.com/wongnai/kube-slack/compare/v2.1.1...v2.1.0
[2.1.0]: https://github.com/wongnai/kube-slack/compare/v2.1.0...v2.0.0
[2.0.0]: https://github.com/wongnai/kube-slack/compare/v2.0.0...v1.1.0
[1.1.0]: https://github.com/wongnai/kube-slack/compare/v1.1.0...v1.0.0
