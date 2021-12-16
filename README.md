# nodegone

Recursively remove node_modules

[![CI](https://github.com/DeveloperRic/nodegone/actions/workflows/main.yml/badge.svg)](https://github.com/DeveloperRic/nodegone/actions/workflows/main.yml)

## Usage

```
npx nodegone <target> [<opts>]
```

### Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| target | Location under which to look | Yes |
| -q, --quiet | Skip log messages | No |
| -y, --yes | Skip confirmation messages | No |
| -D, --dry-run | Don't delete, just find directories | No |
