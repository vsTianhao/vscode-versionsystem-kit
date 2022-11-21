# vscode-versionsystem-kit README

vscode 开发基本插件

## Features

- 开发服务器，就像grunt serve，只不过这是用gulp的
- 信号服务器，就是grunt的livereload，负责修改后在浏览器刷新页面，启动和关闭都伴随开发服务器，可以查看连接情况
- 编译
- 打包
- 上传到服务器
- kendo template高亮语法识别 (有些DOM可能不行) (暂时没好)
- angularjs的高亮跳转
    - 实现了文件内的scope跳转
    - 实现了_.services.xx跳转
- 其他考虑的...

## Requirements

若要开发此项目，需要`npm i`后再手动安装`sass@1.12.0`，确认安装成功后查询sass的代码中是否可以查询到以下字符串
```
is deprecated and will be removed in Dart Sass 2.0.0
```
若能查到则意味安装失败

有十几项配置应该设置在VSCode全局的setting.json中，例如appPath，有几项特别的可以设置在项目目录的.vscode/setting.json中，例如devServerPort

## Extension Settings

可以查阅`package.json`中的`contributes.configuration`

下面只列出几项

* `vskit.devServerPort`: 前端开发服务器的端口号
* `vskit.logLevel`: 本插件的日志等级
* `vskit.logPattern`: 日志打印的格式

**Enjoy!**
