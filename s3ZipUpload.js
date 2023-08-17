const { PassThrough } = require('stream');
const { Upload } = require('@aws-sdk/lib-storage');
const {
  S3Client,
} = require("@aws-sdk/client-s3");
const archiver = require('archiver');
const fs = require("fs")

const { AWS_REGION, S3_BUCKET } = process.env;

const localFile = "./data/input/foo.txt"
const s3FileKey = 'example.jpg';
const outputZipKey = `test.tar.gz`;

const s3Client = new S3Client({ region: AWS_REGION });

(async () => {
  const s3UploadStream = new PassThrough();
  s3UploadStream.on('error', (err) => {
    console.error('error', err);
    throw err;
  });

  const s3Upload = new Upload({
    client: s3Client,
    params: {
      Body: s3UploadStream,
      Bucket: S3_BUCKET,
      ContentType: 'application/gzip',
      Key: outputZipKey,
      ServerSideEncryption: "AES256"
    }
  });

  s3Upload.on('httpUploadProgress', (progress) => {
    console.log(JSON.stringify(progress));
  });

  const uploadPromise = s3Upload.done();

  const archive = archiver("tar", { gzip: true });
  archive.pipe(s3UploadStream);

  archive.on('entry', (f) => {
    console.log(f);
  });

  // const downloadStream = (await s3Client.send(new GetObjectCommand({ Bucket: MEDIA_S3_BUCKET, Key: s3FileKey }))).Body;

  const downloadStream = fs.createReadStream(localFile)
  archive.append(downloadStream, { name: 'foo.txt' });

  await archive.finalize();
  // await s3Upload.done();
  await uploadPromise;
  console.log('done');
})();
