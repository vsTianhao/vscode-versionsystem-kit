# vscode-versionsystem-kit README

versionsystem在vscode中的开发工具

## Features

- 开发服务器，就像grunt serve，只不过这是用gulp的
- 信号服务器，就是grunt的livereload，负责修改后在浏览器刷新页面，启动和关闭都伴随开发服务器，可以查看连接情况
- 编译打包 (暂时没好)
- 上传到服务器 (暂时没好)
- 让服务器打包 (暂时没好)
- kendo template高亮语法识别 (有些DOM可能不行) (暂时没好)
- angularjs的高亮跳转
    - 实现了文件内的scope跳转
- 其他考虑的...

## Requirements

必须要先安装好`sass@1.18.0` (dart2js 2.2.0)，确认安装成功后查询sass版本
``` bash
sass --version
```
应该输出
``` log
1.18.0 compiled with dart2js 2.2.0
```

有十几项配置应该设置在VSCode全局的setting.json中，例如appPath，有几项特别的可以设置在项目目录的.vscode/setting.json中，例如devServerPort

## Extension Settings

可以查阅`package.json`中的`contributes.configuration`

下面只列出几项

* `vskit.devServerPort`: 前端开发服务器的端口号
* `vskit.logLevel`: 本插件的日志等级
* `vskit.logPattern`: 日志打印的格式

**Enjoy!**
