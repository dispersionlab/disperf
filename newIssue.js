const max = require('max-api')
const newGithubIssueUrl = require('new-github-issue-url');
const opn = require('opn');
 
max.addHandler('newIssue', (title, body) => {
    // let url = newGithubIssueUrl({
    //     user: user,
    //     repo: 'telematic',
    //     title: title,
    //     body: body
    // });

    let url = 'https://github.com/dispersionlab/disperf/issues/new?body=' + body + '&title=' +  title
    // Then open it
    opn(url);
})
 
