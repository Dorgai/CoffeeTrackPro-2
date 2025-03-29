#!/bin/bash
export DATABASE_URL="postgresql://neondb_owner:npg_NfgOXev7PdI6@ep-holy-paper-a9xqp5lo-pooler.gwc.azure.neon.tech/neondb?sslmode=require"
yes | npm run db:push 