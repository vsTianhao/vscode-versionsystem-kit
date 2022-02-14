# Change Log

All notable changes to the "vscode-versionsystem-kit" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.


## [1.0.1]
修复了编译时在compile时错误的排序
修复了log4js在`gulp.on("error")`中的self指针错误
修复了上传时取消上传后报错(password必填)

## [1.0.0]
可以上传了
可以跳转`_.services`了
除了markdown不再用中文逗号
不再在`app/**/*.js`中替换`bower_components`

## [0.0.7]
`build`修复完毕
    - 解决只能`build`一次的问题(是因为cwd没有撤回)
    - 将`build-internal-code`部分还原为并发式
    - 修复app.js编译内容的错误

## [0.0.6]
可以编译了(但还存在问题)
可以跳转angularjs的`$scope`了

## [0.0.5]
可以运行开发服务器了

## [Unreleased]

- Initial release
