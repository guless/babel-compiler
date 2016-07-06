# 安装
```shell
npm install babel-compiler --save
```

# 使用方法
```
Usage: bc -e <file> [-o "file"] [-s][-m][-q][-?]

选项：
  -e, --entry       应用程序入口点                               [字符串] [必需]
  -o, --output      编译结果输出位置(默认将编译结果输出至控制台)        [字符串]
  -s, --sourcemaps  是否生成 sourcemaps 文件                              [布尔]
  -m, --minify      是否生成压缩 JS 文件                                  [布尔]
  -q, --quiet       是否启用安静模式                                      [布尔]
  -?, --help        显示帮助信息                                          [布尔]

示例：
  bc.js -e main.js                     将编译结果输出至控制台
  bc.js -s -m -e main.js -o bundle.js  生成 sourcemaps 文件并压缩源文件
```

# 使用 package.json 调用 `bc` 命令
```json
{ 
  "name"   : "example",
  "version": "1.0.0",
  "scripts": {
    "build": "bc -s -m -e ./src/main.js -o ./dist/bundle.js"
  }
}
```