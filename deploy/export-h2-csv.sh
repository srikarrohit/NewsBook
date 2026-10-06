#!/usr/bin/env bash
# One-time export of the Java backend's H2 database to CSV, for
# `newsbook-backend import-h2-csv <out-dir>` (the Rust backend) to load into SQLite.
#
# Run on the OLD server with the Java backend stopped (pm2 stop newsbook-backend),
# so the export is consistent and H2's file lock is free.
#
# Usage: export-h2-csv.sh [h2-jar] [db-path-without-.mv.db] [out-dir]   (absolute paths)
set -euo pipefail

H2_JAR=${1:-/home/ec2-user/newsbook-backend/h2-2.4.240.jar}
DB=${2:-/home/ec2-user/newsbook-backend/data/newsbook}
OUT=${3:-/home/ec2-user/h2-export}
# Must match NULL_MARKER in backend-rs/src/import.rs. CSVWRITE quotes every non-null
# value, so an unquoted marker keeps NULL distinct from an empty string.
NULL_MARKER=__H2_NULL__

[ -f "$H2_JAR" ] || curl -sfL -o "$H2_JAR" https://repo1.maven.org/maven2/com/h2database/h2/2.4.240/h2-2.4.240.jar
mkdir -p "$OUT"

SCRIPT=$(mktemp)
trap 'rm -f "$SCRIPT"' EXIT
for table in users tiles posts ads ad_views; do
  echo "CALL CSVWRITE('$OUT/$table.csv', 'SELECT * FROM $table ORDER BY id', 'charset=UTF-8 null=$NULL_MARKER');" >> "$SCRIPT"
done
# Next id per table. H2 hands out ids in cached blocks, so this is often well past
# MAX(id); carrying it over keeps new ids from reusing ones S3 content keys have seen.
echo "CALL CSVWRITE('$OUT/_identity.csv', 'SELECT LOWER(TABLE_NAME) AS TABLE_NAME, IDENTITY_BASE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ''PUBLIC'' AND IS_IDENTITY = ''YES''', 'charset=UTF-8 null=$NULL_MARKER');" >> "$SCRIPT"

java -cp "$H2_JAR" org.h2.tools.RunScript \
  -url "jdbc:h2:file:$DB;IFEXISTS=TRUE" -user sa -password "" -script "$SCRIPT"

for table in users tiles posts ads ad_views; do
  echo "$table: $(($(wc -l < "$OUT/$table.csv") - 1)) line(s) (rows, plus any multi-line text)"
done
echo "Exported to $OUT"
