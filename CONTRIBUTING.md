# Contributions
This repository is open-source and every interested in our project developer can contribute. We appreciate any bug fixes, features, and optimizations. But before you can start, keep in mind next things.

## What you need to know
- We still don't use code linting. We work hard to add it as soon as possible.
- We still didn't finished refactoring. Feel curious? Look what you can help in at https://github.com/pocketnetteam/pocketnet.gui/issues/441.

- Some dependencies are still not managed by NPM.
- While there are so many things that are still not made, we ask to follow [Airbnb style guide](https://airbnb.io/javascript/) and keep the code as possible easy to understand.

# Branches
- Master - this branch contains all stable code ready for release. Don't pull request here. Use `latest` branch.
- Latest - this branch contains code that was been accepted from contributor pull requests and some commits. As developers do the best to get it stable, it still can contain bugs or issues. If you want to do any contribution in the project - this is the base branch.
- Refactoring - this is a category of branches exclusively targeted to refactor the code. This branches must be merged very carefully, as they may produce some merge issues with existing pull requests or branches. If you want to contribute an enhancement, think about if it is a refactoring of existing feature. If it is so, create an issue with request. We will provide you with your feature branch to pull request in it.
- Dependabot - this is dependabot branches. If you are a contributor normally just ignore them.

## Contribution process
1. Find what you want to add or change in the project.
2. Make fork from our repository.
3. Create separate branch for your task to keep the things easy. Master (or Latest) must not be changed on your fork and must be periodically synchronized with upstream.
4. Make sure that your IDE or editor doesn't format the code stylings. Why? Because currently we have no linter set. Any "empty" changes would complicate the merge process for our git managers.
5. Start changing the code, but don't forget to separate big code changes into logically easy to understand commits with correct descriptions and titles.
6. When everything is ready, make sure to check that code works. We will be even more grateful to you if you check the changes on Cordova and Web builds, but it is fine if you don't. Just check Electron in this case.
7. Provide description of what you changed. We appreciate more if your code is test-covered with Mocha.
8. That's it! You contributed in our project. Now wait while our devs check everything.
