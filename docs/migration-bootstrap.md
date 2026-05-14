# Migration bootstrap

When a database already contains the project schema but `schema_migrations` is empty, the migration runner now
tries to recover automatically.

How it works:

1. It checks known baseline migrations in order.
2. For each migration it verifies representative tables, columns, or seed rows.
3. It records the continuous prefix of already-existing migrations into `schema_migrations`.
4. It applies only the remaining SQL files after that point.

This is meant for databases that were restored from a dump or created before the migration history table was filled.
It avoids rerunning `001...00X` over an existing schema while still letting new migrations run normally.
