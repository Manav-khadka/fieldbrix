# AWS STS and Sentry bootstrap

This is the pre-sprint account setup for Fieldbrix. Complete it before running
Terraform.

The authentication model is:

```text
Mac developer     -> IAM Identity Center -> temporary AWS STS credentials
GitHub Actions    -> GitHub OIDC          -> temporary AWS STS credentials
EC2/application   -> EC2 instance role    -> temporary AWS STS credentials
Runtime secrets   -> AWS SSM Parameter Store (SecureString)
Sentry build token-> GitHub Actions secret, never the application runtime
```

No AWS access key or Sentry auth token belongs in this repository, a `.env`
file committed to Git, Terraform variables/state, screenshots, tickets, or chat.

## 1. Secure the fresh AWS account

Sign in once as the AWS account root user, then complete these items:

- [ ] Add a passkey or hardware security key as root MFA. Keep a second MFA
  method in a separate safe place.
- [ ] Confirm there are **no root access keys** under Security credentials.
- [ ] Set account name, primary contact, and alternate billing, operations, and
  security contacts.
- [ ] In Billing preferences, enable Free Tier usage alerts and billing alerts.
- [ ] Create an AWS Budget with email alerts. For the current small account,
  start with a USD 35 monthly budget and actual alerts at USD 10, 25, and
  35. Add a forecast alert at USD 35 after AWS has enough usage history.
- [ ] Do not add an automatic budget action yet. Budget data is delayed and an
  automatic deny policy can interrupt Terraform or production unexpectedly.
- [ ] Record the credit expiration date. Credits are not a spending hard cap;
  usage can become payable after credits expire or are exhausted.

The Terraform monitoring module creates additional CloudWatch alarms, but it
does not replace the account-level AWS Budget.

## 2. Create the administrator using IAM Identity Center

Do this instead of creating a permanent IAM access key for a human.

1. Open **IAM Identity Center** in the AWS console.
2. Choose `ap-south-1` as the Identity Center home Region, then choose
   **Enable with AWS Organizations** (the organization instance).
   1. Create a group named `fieldbrix-admins`.
3. Create your named user using an email address you control. Do not use a
   shared login. Add the user to `fieldbrix-admins` and require MFA.
4. Under **Multi-account permissions -> Permission sets**, create the
   predefined `AdministratorAccess` permission set. Name it
   `FieldbrixAdministrator` if AWS asks for a display name.
5. Set a practical session duration (for example, 8 hours) so a normal
   Terraform session is not interrupted.
6. Under **AWS accounts**, select this account and assign the
   `fieldbrix-admins` group with that permission set.
7. Copy the **AWS access portal URL**. It resembles
   `https://d-xxxxxxxxxx.awsapps.com/start`.
8. Sign out of the root account. Use the access portal user for daily work.

`AdministratorAccess` is suitable for this one-person bootstrap because the
Terraform code creates IAM roles and many service types. After the initial
infrastructure stabilizes, replace it with a narrower Terraform deployment
permission set and keep the admin permission set for break-glass work.

### If you insist on an IAM user

This is a fallback, not the default:

1. IAM -> Users -> Create user -> `fieldbrix-bootstrap-admin`.
2. Attach the AWS-managed `AdministratorAccess` policy.
3. Enable console MFA before using the user.
4. Create a CLI access key only if IAM Identity Center cannot be used.
5. Store it only in the macOS Keychain or `~/.aws/credentials`, never here.
6. Delete the access key and preferably the user after Identity Center works.

Never create a root-user access key.

## 3. Configure the local Mac

Install the tools:

```bash
brew install awscli terraform jq
aws --version
terraform version
```

Configure an SSO-backed profile:

```bash
aws configure sso --profile fieldbrix
```

Use these answers:

```text
SSO session name:        fieldbrix
SSO start URL:           https://d-9f6756e140.awsapps.com/start/
SSO region:              ap-south-1
SSO registration scope:  sso:account:access
AWS account:             059763918790
Role/permission set:     FieldbrixAdministrator
CLI default region:      ap-south-1
CLI output format:       json
Profile name:            fieldbrix
```

Log in and verify AWS STS:

```bash
aws sso login --profile fieldbrix
aws sts get-caller-identity --profile fieldbrix
```

Success returns the 12-digit account ID and an ARN containing
`arn:aws:sts::...:assumed-role/AWSReservedSSO_...`. That `sts` assumed-role ARN
proves that the Mac is using temporary STS credentials rather than a permanent
human access key.

### Verified local identity — 14 August 2026

Command:

```bash
aws sts get-caller-identity --profile fieldbrix
```

Successful result:

```json
{
  "UserId": "AROAQ32RVA7DNOBPUC34B:manavgenius",
  "Account": "059763918790",
  "Arn": "arn:aws:sts::059763918790:assumed-role/AWSReservedSSO_FieldbrixAdministrator_4c8876d87fe5127e/manavgenius"
}
```

This is safe operational evidence because it contains identifiers, not reusable credentials. Do not record the one-time browser authorization URL, callback port, `state`, authorization code or PKCE challenge; those are ephemeral authentication material.

For daily use from this folder:

```bash
cp aws.env.example aws.env.local
source aws.env.local
./scripts/aws-login.sh
```

`aws.env.local` contains only profile/Region settings, not credentials, and is
gitignored. The login helper checks the current session, opens SSO login only
when needed, then prints the active account and role.

Optional shell convenience:

```bash
alias fieldbrix-aws='cd /absolute/path/to/fieldbrix/terraform && source aws.env.local && ./scripts/aws-login.sh'
```

## 4. Verify before Terraform

Run all of these from the Terraform repository root:

```bash
source aws.env.local
./scripts/aws-login.sh

aws sts get-caller-identity
aws configure get region
aws iam get-account-summary --query 'SummaryMap.AccountMFAEnabled'
aws s3api list-buckets --query 'Buckets[].Name'
```

Expected:

- `get-caller-identity` shows the correct account and an STS assumed-role ARN.
- Region is `ap-south-1`.
- The IAM command succeeds. A value of `1` means the root account has MFA.
- S3 returns an empty list on a fresh account rather than `AccessDenied`.

Then continue with `LOCAL_SETUP.md`, starting at the SSH-key step and Terraform
state bootstrap:

```bash
./scripts/bootstrap.sh
./scripts/plan.sh prod
```

Always read the plan before running `./scripts/apply.sh prod`.

## 5. Configure hosted Sentry

Fieldbrix uses the hosted Sentry platform subscription. Terraform does not
create or host a Sentry server in AWS. AWS SSM only holds the backend DSN so
the EC2 application can read its runtime configuration securely.

1. Use the existing Sentry organization subscription and enable MFA.
2. In organization `fieldbrixxx`, use separate hosted projects so releases and alerts stay understandable:
   - `nest` (NestJS/Node.js)
   - `vite-react` (React)
   - `flutter` (Flutter)
   - `lambdas` (Python AWS Lambda functions)
3. From each project, copy its **DSN**. A DSN is client configuration, not an
   administrative password, but it should still be kept out of committed files
   to reduce event-injection abuse and configuration mistakes.
4. Create a dedicated Sentry internal integration or organization auth token
   for CI source-map/release uploads. Grant only the scopes required by the
   Sentry upload wizard. Do not use a personal all-access token.
5. Save the CI token as the GitHub Actions secret `SENTRY_AUTH_TOKEN`.
6. Save these non-secret identifiers as GitHub variables (or secrets if that is
   simpler for the current repository):
   - `SENTRY_ORG=fieldbrixxx`
   - `SENTRY_BACKEND_PROJECT=nest`
   - `SENTRY_WEB_PROJECT=vite-react`
   - `SENTRY_MOBILE_PROJECT=flutter`
   - `SENTRY_LAMBDAS_PROJECT=lambdas`
7. Enter the backend DSN directly into the interactive SSM setup:

```bash
source aws.env.local
./scripts/secrets-init.sh prod
```

8. Later, provide the web/mobile DSNs through each app's local ignored env file
   and CI build environment. Never put `SENTRY_AUTH_TOKEN` in a browser or
   mobile build; it is CI-only.

Recommended variable names:

| Consumer                  | Variable                     | Storage                            |
| ------------------------- | ---------------------------- | ---------------------------------- |
| NestJS runtime            | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | SSM/deployment config |
| React build               | `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE` | CI environment / ignored local env |
| Flutter build             | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | CI environment / `--dart-define` |
| Lambda runtime            | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` | encrypted function configuration |
| Source-map/release upload | `SENTRY_AUTH_TOKEN` | GitHub Actions secret only |
| Source-map/release upload | `SENTRY_ORG`, project slug | GitHub variable |

Do not enable broad user/session replay or send request bodies until the
application has an explicit PII scrubbing policy. Never send passwords, access
tokens, authorization headers, cookies, customer attachments, or presigned
URLs to Sentry.

## 6. Credential hand-off checklist

Do not write actual secret values below. This is an inventory of what must
exist and where it belongs. When asking another person or agent for help, share
only completion status and non-secret identifiers.

### Safe to record/share

- [x] AWS account ID: `059763918790`
- [x] AWS profile: `fieldbrix`
- [x] AWS workload Region: `ap-south-1`
- [x] IAM Identity Center Region: `ap-south-1`
- [x] Access portal host: `d-9f6756e140.awsapps.com`
- [x] Permission set name: `FieldbrixAdministrator`
- [ ] Billing alert email: `<email>`
- [x] Sentry organization slug: `fieldbrixxx`
- [x] Sentry project slugs: `nest`, `vite-react`, `flutter`, `lambdas`
- [ ] Cloudflare zone ID: `<ID; identifier, not API token>`
- [ ] Public app/API domains: `<domains>`

### Confirm existence; never paste the value

- [ ] Root MFA configured; root access keys absent
- [ ] Sentry backend/web/mobile DSNs stored in their target environments
- [ ] Sentry CI auth token stored as `SENTRY_AUTH_TOKEN`
- [ ] RDS password stored in SSM
- [ ] JWT and refresh secrets stored in SSM and are different values
- [ ] Cloudflare API token stored in SSM
- [ ] Razorpay, MSG91, WhatsApp, Grafana credentials stored in SSM when available
- [ ] Systems Manager access works; no SSH key or port is configured

If a secret was ever pasted into Git, chat, a ticket, or a screenshot, treat it
as compromised: revoke/rotate it first, then continue.

## 7. Final pre-sprint gate

```bash
cd terraform
source aws.env.local
./scripts/aws-login.sh
./scripts/bootstrap.sh
./scripts/secrets-init.sh prod
./scripts/plan.sh prod
```

The foundation is ready when:

- [ ] STS identity is the expected SSO assumed role and AWS account.
- [ ] Root and human access have MFA.
- [ ] The budget alerts are active and the email is confirmed.
- [ ] Terraform state bucket and lock table exist.
- [ ] Required SSM parameter names exist (values remain hidden).
- [ ] Sentry projects, DSNs, and the CI token are stored in the correct places.
- [ ] `terraform plan` completes and has been reviewed.

## Official references

- [AWS IAM security best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Enable IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html)
- [Configure AWS CLI authentication with IAM Identity Center](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [AWS Budgets best practices](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html)
- [Sentry API authentication and auth tokens](https://docs.sentry.io/api/auth/)
