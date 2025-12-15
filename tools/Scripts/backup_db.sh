#!/bin/sh
DATE=$(date +%Y%m%d-%H%M%S)
docker compose exec -it lamington_db pg_dumpall -U postgres --inserts --data-only | gzip -9c > db-$DATE.sql.gz 
