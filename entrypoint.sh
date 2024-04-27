#!/bin/sh

# Run migrations
npm run migrate:prod

# Run the main container command
exec "$@"
