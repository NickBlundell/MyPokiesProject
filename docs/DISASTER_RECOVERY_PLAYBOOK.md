# Disaster Recovery Playbook - MyPokies Platform

## Quick Reference
- **Project ID**: hupruyttzgeytlysobar
- **Region**: ap-southeast-2 (Sydney)
- **Tier**: Supabase Pro (30-day PITR)
- **Dashboard**: https://app.supabase.com/project/hupruyttzgeytlysobar

## Incident Classification

### Severity Level 1: Data Corruption (Partial)
**Definition**: Logical errors affecting specific tables or records
- **RTO**: 4 hours
- **RPO**: 15 minutes
- **Examples**:
  - Corrupted user balances
  - Invalid transaction records
  - Broken foreign key relationships
- **Action**: PITR to timestamp before corruption

### Severity Level 2: Complete Database Loss
**Definition**: Total database unavailability or irreparable damage
- **RTO**: 8 hours
- **RPO**: 1 hour (may extend to 24 hours if PITR fails)
- **Examples**:
  - Complete database deletion
  - Catastrophic hardware failure
  - Ransomware encryption
- **Action**: Full restore from latest backup

### Severity Level 3: Supabase Platform Outage
**Definition**: Supabase service disruption beyond our control
- **RTO**: Dependent on Supabase
- **RPO**: No data loss expected
- **Examples**:
  - AWS region outage
  - Supabase maintenance
  - Network infrastructure failure
- **Action**: Enable maintenance mode, monitor status

### Severity Level 4: Security Breach
**Definition**: Unauthorized data access or modification
- **RTO**: 6 hours (includes security audit)
- **RPO**: Point before breach
- **Examples**:
  - SQL injection attack
  - Compromised admin credentials
  - Insider threat
- **Action**: PITR to clean state + security review

## Incident Response Team

### Primary Contacts
| Role | Name | Contact | Responsibility |
|------|------|---------|----------------|
| Database Admin | [Name] | [Phone/Email] | Lead recovery operations |
| Platform Engineer | [Name] | [Phone/Email] | Application recovery |
| Security Officer | [Name] | [Phone/Email] | Security incidents |
| Operations Manager | [Name] | [Phone/Email] | Business decisions |
| Customer Support Lead | [Name] | [Phone/Email] | User communications |

### External Contacts
- **Supabase Support**: support@supabase.io
- **Supabase Emergency**: Use dashboard support chat for P1 issues
- **AWS Status**: https://status.aws.amazon.com/

### Escalation Matrix
1. **0-30 min**: Technical team only
2. **30-60 min**: + Operations Manager
3. **1-2 hours**: + Executive team
4. **2+ hours**: + Legal/Compliance if data breach

## Recovery Procedures

### Level 1: Data Corruption Recovery

#### Step 1: Immediate Actions (0-15 minutes)
```bash
# 1. Activate incident response
echo "INCIDENT: Data Corruption - $(date)" >> /var/log/incidents.log

# 2. Enable read-only mode (prevent further corruption)
# Via Supabase Dashboard: Database → Settings → Read Replicas → Enable read-only

# 3. Identify corruption scope
psql $DATABASE_URL << EOF
-- Check for negative balances
SELECT COUNT(*), MIN(balance) FROM user_balances WHERE balance < 0;

-- Check for orphaned records
SELECT COUNT(*) FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
WHERE u.id IS NULL;

-- Get last known good timestamp
SELECT MAX(created_at) FROM admin_audit_logs
WHERE action != 'suspected_corruption';
EOF
```

#### Step 2: Diagnosis (15-30 minutes)
```sql
-- Determine corruption timestamp
WITH corruption_detection AS (
  SELECT
    created_at,
    LAG(balance) OVER (PARTITION BY user_id ORDER BY created_at) AS prev_balance,
    balance,
    user_id
  FROM user_balance_history
  WHERE created_at > NOW() - INTERVAL '24 hours'
)
SELECT
  MIN(created_at) AS corruption_started,
  COUNT(DISTINCT user_id) AS affected_users
FROM corruption_detection
WHERE balance < 0 AND prev_balance >= 0;

-- Document affected tables
SELECT
  table_name,
  COUNT(*) AS affected_records
FROM information_schema.tables
-- Run integrity checks per table
```

#### Step 3: Recovery Execution (30 min - 2 hours)
```bash
# 1. Note recovery point (before corruption)
RECOVERY_POINT="2025-10-14T10:30:00Z"

# 2. Notify stakeholders
./scripts/send_notification.sh "Starting PITR to $RECOVERY_POINT"

# 3. Initiate PITR via Supabase CLI
supabase db restore \
  --project-ref hupruyttzgeytlysobar \
  --timestamp "$RECOVERY_POINT" \
  --confirm

# 4. Monitor progress
watch -n 30 'supabase db restore-status --project-ref hupruyttzgeytlysobar'
```

#### Step 4: Validation (2-3 hours)
```sql
-- Verify corruption is resolved
SELECT
  'Balance Check' AS test,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) END AS result
FROM user_balances WHERE balance < 0

UNION ALL

SELECT
  'Orphan Check',
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) END
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
WHERE u.id IS NULL;

-- Verify recent transactions preserved
SELECT
  MAX(created_at) AS latest_transaction,
  NOW() - MAX(created_at) AS data_loss_window
FROM transactions;
```

#### Step 5: Service Restoration (3-4 hours)
```bash
# 1. Re-enable write mode
# Via Dashboard: Database → Settings → Disable read-only

# 2. Restart application servers
systemctl restart mypokies-api
systemctl restart mypokies-workers

# 3. Run health checks
curl https://api.mypokies.com/health

# 4. Clear caches
redis-cli FLUSHALL

# 5. Enable monitoring
./scripts/enable_enhanced_monitoring.sh
```

### Level 2: Complete Database Loss Recovery

#### Step 1: Emergency Response (0-30 minutes)
```bash
# 1. Declare disaster
echo "DISASTER: Complete database loss - $(date)" >> /var/log/disasters.log

# 2. Enable full maintenance mode
curl -X POST https://api.mypokies.com/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "message": "System maintenance in progress"}'

# 3. Stop all workers
systemctl stop mypokies-workers
systemctl stop mypokies-scheduler

# 4. Document last known state
echo "Last backup: $(supabase db backups list --project-ref hupruyttzgeytlysobar | head -1)"
```

#### Step 2: Recovery Initiation (30 min - 1 hour)
```bash
# Option A: PITR to recent point
supabase db restore \
  --project-ref hupruyttzgeytlysobar \
  --timestamp "$(date -u -d '1 hour ago' '+%Y-%m-%dT%H:%M:%S')" \
  --confirm

# Option B: Restore from daily backup (if PITR unavailable)
supabase db restore \
  --project-ref hupruyttzgeytlysobar \
  --backup latest \
  --confirm

# Monitor restoration
while true; do
  STATUS=$(supabase db restore-status --project-ref hupruyttzgeytlysobar)
  echo "$(date): $STATUS"
  if [[ $STATUS == *"completed"* ]]; then break; fi
  sleep 60
done
```

#### Step 3: Data Verification (1-3 hours)
```sql
-- Core tables check
SELECT
  table_name,
  COUNT(*) AS record_count,
  MAX(created_at) AS latest_record
FROM (
  SELECT 'users' AS table_name, COUNT(*), MAX(created_at) FROM users
  UNION ALL
  SELECT 'transactions', COUNT(*), MAX(created_at) FROM transactions
  UNION ALL
  SELECT 'user_balances', COUNT(*), MAX(created_at) FROM user_balances
) t
GROUP BY table_name;

-- Run full integrity check
\i /scripts/verify_backup_integrity.sql
```

#### Step 4: Application Recovery (3-6 hours)
```bash
# 1. Update connection strings if needed
export DATABASE_URL=$(supabase db url --project-ref hupruyttzgeytlysobar)

# 2. Run database migrations
supabase db push --project-ref hupruyttzgeytlysobar

# 3. Restart services in order
systemctl start mypokies-cache
systemctl start mypokies-api
systemctl start mypokies-workers
systemctl start mypokies-scheduler

# 4. Gradual traffic restoration
# 10% traffic
curl -X POST https://loadbalancer/api/traffic \
  -d '{"backend": "mypokies", "percentage": 10}'
sleep 300

# 50% traffic
curl -X POST https://loadbalancer/api/traffic \
  -d '{"backend": "mypokies", "percentage": 50}'
sleep 300

# 100% traffic
curl -X POST https://loadbalancer/api/traffic \
  -d '{"backend": "mypokies", "percentage": 100}'
```

#### Step 5: Post-Recovery Actions (6-8 hours)
```bash
# 1. Disable maintenance mode
curl -X POST https://api.mypokies.com/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": false}'

# 2. Send recovery notifications
./scripts/notify_users.sh "Service has been restored. We apologize for any inconvenience."

# 3. Generate incident report
./scripts/generate_incident_report.sh \
  --type "database_loss" \
  --start "$INCIDENT_START" \
  --end "$(date)" \
  --data-loss "$RPO_ACTUAL" \
  > "/reports/incident_$(date +%Y%m%d).md"
```

### Level 3: Platform Outage Response

#### Monitoring and Communication
```bash
# 1. Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# 2. Check AWS status
curl https://status.aws.amazon.com/data.json | jq '.services[] | select(.name=="EC2") | .status'

# 3. Enable status page
echo "Monitoring external service outage" > /var/www/status.html

# 4. Set up auto-refresh monitoring
watch -n 60 'curl -s https://status.supabase.com/api/v2/incidents.json | jq .incidents[0]'
```

#### Maintenance Mode Operations
```javascript
// Enable graceful degradation
const maintenanceConfig = {
  enabled: true,
  mode: 'platform_outage',
  features: {
    deposits: false,
    withdrawals: false,
    gaming: false,
    registration: false,
    support: true  // Keep support active
  },
  message: 'We are experiencing technical difficulties. Your funds are safe.',
  estimatedResolution: null  // Unknown for platform outages
};

// Cache critical data locally
await cacheUserSessions();
await cacheActiveGames();
await cacheBalances();
```

### Level 4: Security Breach Response

#### Immediate Containment (0-15 minutes)
```bash
# 1. Isolate affected systems
iptables -I INPUT -s $SUSPICIOUS_IP -j DROP

# 2. Revoke all sessions
psql $DATABASE_URL -c "DELETE FROM auth.sessions;"

# 3. Reset all API keys
supabase secrets set --project-ref hupruyttzgeytlysobar \
  ANON_KEY="$(uuidgen)" \
  SERVICE_KEY="$(uuidgen)"

# 4. Enable audit mode
psql $DATABASE_URL -c "
  INSERT INTO security_incidents (type, status, started_at)
  VALUES ('breach_suspected', 'investigating', NOW());
"
```

#### Forensic Analysis (15 min - 2 hours)
```sql
-- Identify suspicious activity
SELECT
  user_id,
  action,
  ip_address,
  created_at,
  details
FROM admin_audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND (
    ip_address NOT IN (SELECT ip FROM trusted_ips)
    OR action IN ('bulk_export', 'permission_change', 'user_deletion')
    OR details LIKE '%DROP%'
    OR details LIKE '%DELETE FROM%'
  )
ORDER BY created_at DESC;

-- Check for data exfiltration
SELECT
  query,
  user_name,
  client_addr,
  query_start
FROM pg_stat_activity
WHERE query LIKE '%SELECT%FROM%users%'
  OR query LIKE '%pg_dump%'
ORDER BY query_start DESC;
```

## Communication Templates

### Initial Incident Notification
```
Subject: System Maintenance Alert

Dear Team,

We are currently experiencing [technical issues/scheduled maintenance] affecting the MyPokies platform.

Status: Investigating
Started: [TIME]
Impact: [Describe impact]
Updates: Every 30 minutes

Please standby for further instructions.

Incident Commander: [Name]
```

### Customer Communication (2+ hours downtime)
```
Subject: Important Service Update

Dear Valued Player,

We are currently performing emergency maintenance on our platform to ensure the security and integrity of your account.

What's happening:
- Temporary service interruption
- Your funds and data remain secure
- No action required from you

Expected resolution: [TIME/TBD]

We sincerely apologize for the inconvenience and appreciate your patience.

The MyPokies Team
```

### Resolution Notification
```
Subject: Service Restored

Dear Team,

The incident reported at [START TIME] has been resolved.

Resolution time: [DURATION]
Data loss: [None/Specify]
Root cause: [Brief description]
Next steps: Post-incident review scheduled for [DATE]

Full incident report will be available within 24 hours.

Thank you for your patience and support.
```

## Post-Incident Procedures

### Incident Review Meeting (Within 48 hours)
1. Timeline review
2. Decision analysis
3. Impact assessment
4. Lessons learned
5. Action items

### Documentation Requirements
- Incident report (within 24 hours)
- Root cause analysis (within 72 hours)
- Regulatory notifications (as required)
- Customer compensation review

### Process Improvements
- Update runbooks based on lessons learned
- Revise monitoring alerts
- Enhance backup procedures
- Security hardening recommendations

## Testing Schedule

### Monthly Tests
- [ ] PITR recovery drill (staging)
- [ ] Backup integrity verification
- [ ] Communication system test
- [ ] Team contact verification

### Quarterly Tests
- [ ] Full disaster recovery simulation
- [ ] Failover testing
- [ ] Security incident tabletop
- [ ] Third-party recovery audit

### Annual Reviews
- [ ] Complete DR plan review
- [ ] RTO/RPO reassessment
- [ ] Vendor capability review
- [ ] Compliance audit

## Appendix A: Quick Commands

### Database Access
```bash
# Production database
psql "postgresql://postgres:[PASSWORD]@db.hupruyttzgeytlysobar.supabase.co:5432/postgres"

# Read replica (if available)
psql "postgresql://postgres:[PASSWORD]@db-replica.hupruyttzgeytlysobar.supabase.co:5432/postgres"
```

### Monitoring Queries
```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Recent errors
SELECT * FROM admin_audit_logs
WHERE level = 'ERROR'
ORDER BY created_at DESC
LIMIT 10;
```

### Service Management
```bash
# Check all services
systemctl status mypokies-*

# Emergency stop
systemctl stop mypokies-api mypokies-workers mypokies-scheduler

# Restart sequence
systemctl restart mypokies-cache
sleep 5
systemctl restart mypokies-api
sleep 5
systemctl restart mypokies-workers
```

## Appendix B: Regulatory Requirements

### Australian Compliance
- ACMA notification: Required for >4 hour outage
- AUSTRAC reporting: Required for security breaches
- Privacy Act: Breach notification within 72 hours

### Documentation Retention
- Incident reports: 7 years
- Audit logs: 5 years
- Recovery test results: 3 years

## Version History
- v1.0 - Initial playbook (October 2025)
- Last Updated: October 2025
- Next Review: January 2026
- Owner: Platform Operations Team