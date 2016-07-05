# 安装
```shell
npm install babel-compiler --save
```

# 使用方法
```
Usage: bc -e <file> [-o "file"] [-s]

选项：
  -e, --entry       应用程序入口点                               [字符串] [必需]
  -o, --output      编译结果输出位置(默认将编译结果输出至控制台)        [字符串]
  -s, --sourcemaps  是否生成 sourcemaps 文件并压缩源文件                  [布尔]
  -q, --quiet       是否启用安静模式                                      [布尔]
  -?, --help        显示帮助信息                                          [布尔]

示例：
  node_modules/.bin/bc -e main.js           将编译结果输出至控制台
  node_modules/.bin/bc -s -e main.js -o     生成 sourcemaps 文件并压缩源文件
  bundle.js
```

# 使用 package.json 调用 `bc` 命令
```json
{
    ...
    "scripts": {
        "build": "bc -s -e ./src/main.js -o ./dist/main.js
    }
}
```