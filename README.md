# ofuton
A lightweight object storage exclusive for misskey.  

## Features
Compatible with the following APIs of s3.  
- PutObject
- DeleteObject
- CreateMultiPartUpload
- UploadPart
- CompleteMultipartUpload
- AbortMultipartUpload

Misskey uses only these APIs, so you can use ofuton as a s3-compatible object storage for Misskey.

## Setup
> **Note**  
> "Ofuton" requires the following software will be installed and configured.  
>  - Node.js (v18.0.0 or later)
>  - pnpm

### 1. Clone this repository
```bash
git clone https://github.com/hideki0403/ofuton.git
```

### 2. Install dependencies
```bash
cd ofuton
pnpm install
```

### 3. Build
```bash
pnpm build
```

### 4. Configure
```bash
cp config.example.yml config.yml
```

### 5. Run
```bash
pnpm start

# If pm2 is installed, you can start it with the following command.
# pm2 start pm2.json
```

### 6. Configure misskey
Open your instance's control panel and go to "Object Storage" tab.  
Set the following values. (The values in the brackets are optional)

| Name | Value |
| ---- | ----- |
| BaseURL | `https://<domain>/<bucket>` |
| Bucket | `<bucket>` |
| Prefix | `<prefix>` |
| Endpoint | `<IP>:<port>` |
| Region | `auto` |
| AccessKey | `<accessKey>` |
| SecretKey | `<secretKey>` |
| UseSSL | `false` |
| Connect over Proxy | `false` |
| Set "publc-read" on upload | `false` |
| s3ForcePathStyle | `true` |
  
- The bucket name can be anything.
- IP of endpoint is the ip of the server where ofuton is set up.
- port, accessKey and secretKey are the ones set in config.yml.