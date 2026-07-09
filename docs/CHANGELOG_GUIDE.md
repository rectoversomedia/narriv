# Keep a Changelog

## Summary

This project maintains a changelog following the Keep a Changelog standard.

## Format

All changes should be categorized under these headers:

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes

## Process

1. All changes must be documented before merging to main
2. Use imperative mood ("Add" not "Added")
3. Be specific about what changed
4. Include issue/PR numbers when available
5. Breaking changes must be clearly marked

## Example

```markdown
## [2.0.0] - 2024-01-15

### Added
- New authentication system with OAuth2 support (#123)
- Rate limiting middleware (#456)

### Changed
- **BREAKING** API response format changed to JSON:API standard (#789)
- Updated dependencies to latest versions

### Deprecated
- `/api/v1/users` endpoint deprecated, use `/api/v2/users`

### Removed
- Legacy SOAP API support

### Fixed
- Memory leak in websocket connections (#234)
- Invalid token handling (#345)

### Security
- Updated bcrypt to 14 rounds
- Added CSRF protection
```

## Version History

See [CHANGELOG.md](CHANGELOG.md) for the complete version history.
