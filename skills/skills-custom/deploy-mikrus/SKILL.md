---
name: deploy-mikrus
description: Comprehensive deployment system for publishing web applications and static projects to a VPS server (Mikrus) using rsync over SSH. Use when the user asks to "deploy", "send to server", "publish", or "update" the application on the Mikrus server. Supports dry-runs, live deployments, and cleaning up legacy files.
---

# Deploy Mikrus

This skill facilitates the deployment of projects to your Mikrus VPS using a specialized shell script.

### Workflow

1.  **Identify the Target**: Decide on the application name (folder name on the server).
2.  **Navigate to Project**: Ensure you are in the root directory of the project you want to deploy.
3.  **Perform Dry Run**: Always start with a dry run to verify what files will be sent.
4.  **Execute Deployment**: Once verified, run the actual deployment.

### Commands

The deployment is handled by the script found at:
`/Users/marek/OfflineDocuments/Repo/Antigravity/Design/skills/skills-custom/deploy-mikrus/scripts/deploy.sh`

#### 1. Dry Run (Safe Test)
Test the deployment without making changes to the server:
```bash
/Users/marek/OfflineDocuments/Repo/Antigravity/Design/skills/skills-custom/deploy-mikrus/scripts/deploy.sh <app_name>
```

#### 2. Live Deployment
Perform the actual file transfer:
```bash
/Users/marek/OfflineDocuments/Repo/Antigravity/Design/skills/skills-custom/deploy-mikrus/scripts/deploy.sh --go <app_name>
```

#### 3. Live Deployment with Cleanup
Transfer files and remove any files on the server that are no longer present locally:
```bash
/Users/marek/OfflineDocuments/Repo/Antigravity/Design/skills/skills-custom/deploy-mikrus/scripts/deploy.sh --go --delete <app_name>
```

### Configuration
The script uses the following defaults:
- **Server**: `aneta131.mikrus.xyz`
- **Port**: `10131`
- **User**: `deploy`
- **Base Directory**: `/cytrus/katalog1`
- **Key**: `~/.ssh/id_ed25519_mikrus_deploy`

You can override these by setting environment variables (e.g., `REMOTE_HOST`, `REMOTE_PORT`) before running the script if necessary.
