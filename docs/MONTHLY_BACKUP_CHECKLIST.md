# Monthly Backup Verification Checklist

## Overview
This checklist must be completed monthly to ensure backup integrity and disaster recovery readiness for the MyPokies platform.

---

## Checklist Information

**Date**: __________
**Performed by**: __________
**Start Time**: __________
**Completion Time**: __________
**Supabase Project**: hupruyttzgeytlysobar (MyPokies)
**Environment**: ☐ Production ☐ Staging

---

## Section 1: Backup Configuration Verification

### Supabase Backup Settings
- [ ] Log into Supabase Dashboard: https://app.supabase.com/project/hupruyttzgeytlysobar
- [ ] Navigate to Database → Backups
- [ ] Verify daily backups are enabled
- [ ] Confirm PITR is active (Pro plan - 30 days retention)
- [ ] Check last successful backup timestamp: __________
- [ ] Verify backup retention period: __________ days
- [ ] Review backup storage usage: __________ GB
- [ ] Check for any backup failure alerts

### Backup Health Metrics
- [ ] Database size: __________ GB
- [ ] Backup size: __________ GB
- [ ] Compression ratio: __________ %
- [ ] Estimated recovery time: __________ minutes

---

## Section 2: Data Integrity Verification

### Run Integrity Check Script
- [ ] Execute `/scripts/verify_backup_integrity.sql`
- [ ] Document results:
  - Database size: __________
  - Critical table sizes verified
  - Data freshness check: ☐ PASS ☐ FAIL
  - Integrity checks: ☐ PASS ☐ FAIL
  - Foreign key integrity: ☐ PASS ☐ FAIL
  - Sequence health: ☐ PASS ☐ FAIL
  - Index health: ☐ PASS ☐ FAIL
  - Overall score: _____ /100

### Issues Found
- [ ] No issues detected
- [ ] Issues documented (list below):
  1. __________
  2. __________
  3. __________

### Critical Table Verification
- [ ] users table - Record count: __________
- [ ] transactions table - Record count: __________
- [ ] user_balances table - All positive: ☐ Yes ☐ No
- [ ] player_bonuses table - No orphans: ☐ Yes ☐ No
- [ ] game_rounds table - Recent activity: ☐ Yes ☐ No
- [ ] admin_audit_logs table - Logging active: ☐ Yes ☐ No

---

## Section 3: PITR Test Execution

### Test Environment Setup
- [ ] Staging environment available
- [ ] Test data identified (non-production)
- [ ] Stakeholders notified of test window

### PITR Test Procedure
- [ ] Record pre-test state:
  - Timestamp: __________
  - Test table record count: __________
  - Screenshot taken: ☐ Yes ☐ No

- [ ] Simulate data modification/loss:
  - Type of simulation: ☐ Deletion ☐ Corruption ☐ Update
  - Affected records: __________
  - Simulation completed: __________

- [ ] Perform PITR recovery:
  - Recovery initiated: __________ (time)
  - Target timestamp: __________
  - Recovery method: ☐ Dashboard ☐ CLI
  - Recovery completed: __________ (time)
  - **Total recovery time**: __________ minutes

- [ ] Verify recovery success:
  - Data restored correctly: ☐ Yes ☐ No
  - Record counts match: ☐ Yes ☐ No
  - Application connects: ☐ Yes ☐ No
  - No data corruption: ☐ Yes ☐ No

### PITR Test Results
- [ ] Test passed successfully
- [ ] Issues encountered (document below):
  - __________
  - __________

---

## Section 4: Documentation Review

### Document Updates
- [ ] Review BACKUP_VERIFICATION_STRATEGY.md
  - RTO still achievable: ☐ Yes ☐ No
  - RPO still achievable: ☐ Yes ☐ No
  - Updates needed: ☐ Yes ☐ No

- [ ] Review DISASTER_RECOVERY_PLAYBOOK.md
  - Contact information current: ☐ Yes ☐ No
  - Procedures still valid: ☐ Yes ☐ No
  - Updates applied: ☐ Yes ☐ No

- [ ] Review PITR_TEST_PROCEDURE.md
  - Steps still accurate: ☐ Yes ☐ No
  - New scenarios needed: ☐ Yes ☐ No

### Team Readiness
- [ ] Emergency contacts verified
- [ ] On-call rotation updated
- [ ] Team trained on procedures
- [ ] Escalation paths confirmed

---

## Section 5: Monitoring and Alerting

### Alert Configuration
- [ ] Backup failure alerts configured
- [ ] Storage threshold alerts (>80%)
- [ ] WAL lag alerts active
- [ ] Database size growth alerts
- [ ] All alerts tested this month

### Monitoring Dashboard
- [ ] Backup status widget working
- [ ] Recovery metrics displayed
- [ ] Historical trend data available
- [ ] SLA compliance tracking active

---

## Section 6: Compliance and Reporting

### Regulatory Compliance
- [ ] Backup retention meets regulatory requirements
- [ ] Audit logs properly maintained
- [ ] Data residency compliance verified
- [ ] Encryption at rest confirmed

### Management Reporting
- [ ] Monthly backup report generated
- [ ] RTO/RPO metrics documented
- [ ] Cost analysis completed
- [ ] Improvement recommendations documented

---

## Section 7: Action Items

### Immediate Actions Required
- [ ] None required
- [ ] Actions needed (list below):
  1. __________
  2. __________
  3. __________

### Follow-up Tasks
| Task | Owner | Due Date | Status |
|------|-------|----------|--------|
| | | | |
| | | | |
| | | | |

---

## Section 8: Sign-off

### Technical Verification
**Database Administrator**
Name: __________
Signature: __________
Date: __________

Comments:
_________________________________
_________________________________

### Management Approval
**Operations Manager**
Name: __________
Signature: __________
Date: __________

Comments:
_________________________________
_________________________________

---

## Performance Metrics Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| RTO (Recovery Time) | 4 hours | _____ | ☐ Met ☐ Not Met |
| RPO (Data Loss) | 15 minutes | _____ | ☐ Met ☐ Not Met |
| Backup Success Rate | 100% | _____ % | ☐ Met ☐ Not Met |
| PITR Test Success | Pass | _____ | ☐ Pass ☐ Fail |
| Integrity Check Score | >90 | _____ | ☐ Met ☐ Not Met |

---

## Notes and Observations

### What Went Well
_________________________________
_________________________________
_________________________________

### Areas for Improvement
_________________________________
_________________________________
_________________________________

### Recommendations for Next Month
_________________________________
_________________________________
_________________________________

---

## Next Review

**Scheduled Date**: __________ (Same date next month)
**Assigned To**: __________
**Calendar Invite Sent**: ☐ Yes ☐ No

---

## Attachments Checklist

- [ ] Backup integrity script output
- [ ] PITR test results screenshot
- [ ] Supabase backup status screenshot
- [ ] Any error logs or issues
- [ ] Updated contact list (if changed)

---

## Distribution List

- [ ] Database Administrator
- [ ] Operations Manager
- [ ] Technical Lead
- [ ] Compliance Officer
- [ ] CTO/IT Director
- [ ] Archive to: /docs/backup-reports/YYYY-MM/

---

## Version History

- v1.0 - Initial checklist (October 2025)
- Last Updated: October 2025
- Next Review: November 2025
- Template Owner: Platform Operations

---

*This checklist is a living document. Please suggest improvements and updates based on your experience during the monthly verification process.*