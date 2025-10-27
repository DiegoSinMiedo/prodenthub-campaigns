# 🌐 DNS Setup Instructions for campaigns.prodenthub.com.au

## ✅ What I've Done For You

1. ✅ **SSL Certificate Requested**: `arn:aws:acm:us-east-1:867344432133:certificate/857e0b0a-4b5a-4c60-bc2d-99cfd2e04cb9`
2. ✅ **Generated DNS validation record** (see below)

---

## 🎯 What YOU Need to Do (10 minutes)

Your DNS is managed by **Namecheap**. You need to add 1 DNS record to validate the SSL certificate.

---

## Step 1: Add DNS Validation Record in Namecheap

### Go to Namecheap DNS Management:
1. Login to Namecheap: https://ap.www.namecheap.com/
2. Go to **Domain List**
3. Click **Manage** next to `prodenthub.com.au`
4. Go to **Advanced DNS** tab

### Add This CNAME Record:

```
Type: CNAME Record
Host: _82844e33faca606a3316e66f53727b0c.campaigns
Value: _bb19f996eda8ada0274366b093323eba.xlfgrmvvlj.acm-validations.aws.
TTL: Automatic (or 300 seconds)
```

**Important:**
- The **Host** is: `_82844e33faca606a3316e66f53727b0c.campaigns`
- The **Value** MUST end with a dot (`.`)
- This is only for SSL validation - it won't affect your website

### Screenshot for Reference:
```
┌──────────┬─────────────────────────────────────────────┬────────────────────────────────────────────┬─────┐
│   Type   │                    Host                     │                   Value                    │ TTL │
├──────────┼─────────────────────────────────────────────┼────────────────────────────────────────────┼─────┤
│  CNAME   │ _82844e33faca606a3316e66f53727b0c.campaigns │ _bb19f996eda8ada0274366b093323eba.xlf... │ 300 │
└──────────┴─────────────────────────────────────────────┴────────────────────────────────────────────┴─────┘
```

---

## Step 2: Wait for Validation (5-10 minutes)

After adding the DNS record, AWS will automatically validate the certificate.

**Check validation status:**
```bash
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:us-east-1:867344432133:certificate/857e0b0a-4b5a-4c60-bc2d-99cfd2e04cb9" \
  --region us-east-1 \
  --query 'Certificate.Status'
```

Wait until it returns: `"ISSUED"`

Or check in AWS Console:
https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1#/certificates/list

---

## Step 3: Tell Me When It's Done!

Once you've added the DNS record in Namecheap, let me know and I'll:

1. ✅ Create the CloudFront distribution
2. ✅ Configure HTTPS and caching
3. ✅ Give you the final DNS record to add for `campaigns.prodenthub.com.au`

---

## 📝 Quick Copy-Paste Values

### For Namecheap DNS:

**Host (Name):**
```
_82844e33faca606a3316e66f53727b0c.campaigns
```

**Value (Target):**
```
_bb19f996eda8ada0274366b093323eba.xlfgrmvvlj.acm-validations.aws.
```

---

## ❓ Troubleshooting

### "Can't find the Advanced DNS tab"
- Make sure you're in the **Domain List**
- Click **Manage** (not just select the domain)
- Look for tabs: Details, Products, Advanced DNS

### "Value doesn't accept the trailing dot"
- Some DNS providers automatically add it
- Try without the dot: `_bb19f996eda8ada0274366b093323eba.xlfgrmvvlj.acm-validations.aws`

### "How long does validation take?"
- Usually 5-10 minutes after DNS propagates
- Can take up to 30 minutes in some cases
- Check status with the AWS command above

---

## 🎯 Current Status

- ✅ S3 bucket deployed
- ✅ Landing page live (HTTP): http://prodenthub-campaigns.s3-website-ap-southeast-2.amazonaws.com/adc-exam-guide/
- ⏳ SSL certificate requested (waiting for DNS validation)
- ⏳ CloudFront distribution (will create after certificate is validated)
- ⏳ HTTPS URL: https://campaigns.prodenthub.com.au/adc-exam-guide/ (coming soon!)

---

**Next:** Add the CNAME record in Namecheap, then let me know so I can continue with the CloudFront setup! 🚀
