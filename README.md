# Journalyst Backend Task
Broker Sync – Backend Integration Layer

Broker Sync is a backend module for Journalyst’s trade journaling platform.
It demonstrates syncing trades from a third-party broker (Zerodha) and normalizing them into a consistent format.

Goals

Build a broker adapter (Zerodha)

Normalize trade data into a consistent schema

Simulate token storage, expiry, and refresh

Provide sync logic: syncTrades(userId, brokerName)

Modular architecture for extensibility

Features

Zerodha login integration (via Kite Connect API)

Fetch and normalize trade data

Token management (simulated in-memory)

Sync execution logic with minimal error handling
