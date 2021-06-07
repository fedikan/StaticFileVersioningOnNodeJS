const crypto = require("crypto");
const fs = require("fs");
require('dotenv').config()

function checksum(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("hex");
}

const findChangedFiles = (path) => {
  const data = fs.readdirSync(path);

  const distFolderPath = `dist/${path}`;
  if (!fs.existsSync(distFolderPath)) {
    fs.mkdirSync(distFolderPath, { recursive: true });
  }

  for (item of data) {
    const newPath = `${path}/${item}`;
    const isItemDirectory = fs.lstatSync(newPath).isDirectory();
    if (isItemDirectory) {
      findChangedFiles(newPath);
    } else {
      cacheFile(newPath);
    }
  }

};

const cacheFile = async (path) => {
  fs.readFile(path, (err, data) => {
    const hash = checksum(data);
    const extension = path.split('.').slice(-1)[0]
    const newFileName = `${path.split('.')[0]}.${hash}.${extension}`;
    const distPath = `dist/${newFileName}`;
    const isFileCached = fs.existsSync(distPath);
    if (!isFileCached) {
      require("glob").glob(`dist/${path}?*`, (err, files) => {
        if (err) throw err;
        const oldCachePath = files[0];

        fs.copyFileSync(path, distPath);
        console.log(`${distPath} created`);

        if (!oldCachePath) {
          updateHtml(oldCachePath, newFileName, path);
          return;
        }
        fs.unlinkSync(oldCachePath);
        updateHtml(oldCachePath, newFileName);
      });
    }
  });
};

const updateHtml = async (
  oldFileName,
  newFileName,
  initialPath = "default"
) => {
  require("glob").glob(`*.html`, async (err, files) => {
    if (err) throw err;
    for (file of files) {
      const data = fs.readFileSync(file, { encoding: "utf-8" });
      const replaceRegex = new RegExp(`"dist/${oldFileName}"|"${initialPath}"`);
      const replaceString = `"dist/${newFileName}"`;

      const newData = data.replace(replaceRegex, replaceString);
      fs.writeFileSync(file, newData);
    }
  });
};
const isProd = JSON.parse(process.env.PRODUCTION)

if(isProd){
  const foldersToWatch = JSON.parse(process.env.FOLDERS_TO_WATCH)
  
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  for(folder of foldersToWatch){
    findChangedFiles(folder);
  }
}
