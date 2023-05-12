# Contributing

Youtube Video Looper is an open source project licensed under the MIT license.
Contributions are welcome, and greatly appreciated.

If you would like to help, getting started is easy.

## Get Started

1. You must have a github account and be logged in
2. Fork the repo by clicking the "Fork" link on the top-right corner of the page
3. Once the fork is ready, clone to your local PC

   ```sh
   $ git clone https://github.com/<USERNAME>/youtube-video-looper.git
   Cloning into 'youtube-video-looper'...
    remote: Enumerating objects: 10, done.
    remote: Counting objects: 100% (10/10), done.
    remote: Compressing objects: 100% (9/9), done.
    remote: Total 877 (delta 3), reused 2 (delta 1), pack-reused 867
    Receiving objects: 100% (877/877), 317.65 KiB | 2.17 MiB/s, done.
    Resolving deltas: 100% (543/543), done.
   ```

4. Create a branch for your changes

   ```sh
    $ cd youtube-video-looper
    youtube-video-looper$ git checkout -b add-new-feature
    M   README.md
    M   src/content-scripts/content.js
    Switched to a new branch 'add-new-feature'
    youtube-video-looper$
   ```

5. Open the code in your favorite code editor, make your changes

   ```sh
   echo "Awesome changes" > somefile.js
   git add .
   ```

   > Important: Your commit must be formatted using
   > [prettier](https://prettier.io/). If it is not it may be autoformatted for
   > you or your pull request may be rejected.

6. Next, open Chrome/Brave/Chromium and enable developer mode via
   `Settings > Extensions > Manage Extensions` and toggle `Developer mode` in
   the top-right corner.
7. Click `Load unpacked` and browse to the `src` folder inside the folder you cloned youtube-video-looper to.
8. Try out your changes, make sure they work as expected
9. Commit and push your changes to github

   ```sh
   git commit -m "Awesome description of some awesome changes."
   git push
   ```

10. Open your branch up on the github website then click `New pull request` and
    write up a description of your changes.
