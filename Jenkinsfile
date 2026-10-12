
pipeline {
    agent any

    tools {
        // Configure NodeJS installation as Node20 in Jenkins > Tools
        nodejs 'Node20'
    }
parameters {
    choice(
        name: 'BRANCH',
        choices: ['master', 'develop'],
        description: 'Select the Git branch to execute tests from'
    )

    choice(
        name: 'ENVIRONMENT',
        choices: ['qa', 'dev', 'staging'],
        description: 'Environment to test'
    )

    choice(
        name: 'BROWSER',
        choices: ['all', 'chromium', 'firefox', 'webkit'],
        description: 'Browser to execute tests on'
    )

    choice(
        name: 'SUITE',
        choices: ['all', 'smoke', 'regression'],
        description: 'Test suite to execute'
    )
}

    options {
        skipDefaultCheckout(true)
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
    }

    environment {
        CI = 'true'
        HEADLESS = 'true'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'master',
                    url: 'https://github.com/Ranjeetvelocity13/20Jun_Playwright_Framework.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Install Playwright Browsers') {
            steps {
                sh 'npx playwright install --with-deps'
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    // Create report directories before execution
                    sh 'mkdir -p reports/junit-report reports/allure-results'

                    def projectFlag = params.BROWSER == 'all'
                        ? ''
                        : "--project=${params.BROWSER}"

                    def grepFlag = ''

                    if (params.SUITE == 'smoke') {
                        grepFlag = '--grep @smoke'
                    } else if (params.SUITE == 'regression') {
                        grepFlag = '--grep @regression'
                    }

                    withEnv(["ENV=${params.ENVIRONMENT}"]) {
                        sh "npx playwright test ${projectFlag} ${grepFlag}"
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                // 1. Publish JUnit results
                try {
                    junit(
                        allowEmptyResults: true,
                        testResults: 'reports/junit-report/results.xml'
                    )
                } catch (err) {
                    echo "JUnit publishing failed: ${err}"
                }

                // 2. Generate and publish Allure when results exist
                try {
                    def allureResults = sh(
                        script: "find reports/allure-results -type f -name '*-result.json' -print -quit 2>/dev/null || true",
                        returnStdout: true
                    ).trim()

                    if (allureResults) {
                        sh 'npm run allure:generate'

                        allure([
                            includeProperties: false,
                            jdk: '',
                            results: [[path: 'reports/allure-results']]
                        ])
                    } else {
                        echo 'No Allure results found; skipping Allure publishing.'
                    }
                } catch (err) {
                    echo "Allure reporting failed: ${err}"
                }

                // 3. Archive generated reports and test artifacts
                try {
                    archiveArtifacts(
                        artifacts: 'playwright-report/**, reports/**, test-results/**, allure-report/**',
                        allowEmptyArchive: true
                    )
                } catch (err) {
                    echo "Artifact archiving failed: ${err}"
                }

                // 4. Publish Playwright HTML report
                try {
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright HTML Report'
                    ])
                } catch (err) {
                    echo "Playwright HTML publishing failed: ${err}"
                }

                // 5. Send professional HTML email
                try {
                    emailext(
                        to: 'ranjeetkendre1995@gmail.com',
                        mimeType: 'text/html',
                        subject: "Playwright Report - Build #${env.BUILD_NUMBER} - ${currentBuild.currentResult}",
                        body: """
<html>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <div style="max-width:700px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <div style="background:#172554;padding:26px;color:#ffffff;">
      <h1 style="margin:0;font-size:24px;">Playwright Automation Report</h1>
      <p style="margin:10px 0 0;color:#cbd5e1;">Build #${env.BUILD_NUMBER} | ${env.JOB_NAME}</p>
    </div>

    <div style="padding:24px;">
      <p style="font-size:16px;">Hello Team,</p>
      <p>Here is the summary of the latest Playwright execution.</p>

      <div style="padding:16px;border-radius:8px;background:${currentBuild.currentResult == 'SUCCESS' ? '#dcfce7' : '#fee2e2'};border:1px solid ${currentBuild.currentResult == 'SUCCESS' ? '#86efac' : '#fca5a5'};">
        <span style="font-size:13px;color:#475569;">BUILD STATUS</span>
        <h2 style="margin:8px 0 0;color:${currentBuild.currentResult == 'SUCCESS' ? '#166534' : '#991b1b'};">${currentBuild.currentResult}</h2>
      </div>

      <h3 style="margin-top:28px;color:#172554;">Execution Details</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr style="background:#f8fafc;">
          <td style="padding:12px;border:1px solid #e2e8f0;">Job Name</td>
          <td style="padding:12px;border:1px solid #e2e8f0;">${env.JOB_NAME}</td>
        </tr>
        <tr>
          <td style="padding:12px;border:1px solid #e2e8f0;">Environment</td>
          <td style="padding:12px;border:1px solid #e2e8f0;">${params.ENVIRONMENT}</td>
        </tr>
        <tr style="background:#f8fafc;">
          <td style="padding:12px;border:1px solid #e2e8f0;">Browser</td>
          <td style="padding:12px;border:1px solid #e2e8f0;">${params.BROWSER}</td>
        </tr>
        <tr>
          <td style="padding:12px;border:1px solid #e2e8f0;">Test Suite</td>
          <td style="padding:12px;border:1px solid #e2e8f0;">${params.SUITE}</td>
        </tr>
      </table>

      <h3 style="margin-top:28px;color:#172554;">Test Results</h3>
      <table style="width:100%;border-collapse:collapse;text-align:center;">
        <tr>
          <td style="padding:12px;background:#e2e8f0;">
            <div style="font-size:12px;">TOTAL</div>
            <strong style="font-size:24px;color:#334155;">\${TEST_COUNTS, var="total"}</strong>
          </td>
          <td style="width:6px;"></td>
          <td style="padding:12px;background:#dcfce7;">
            <div style="font-size:12px;">PASSED</div>
            <strong style="font-size:24px;color:#166534;">\${TEST_COUNTS, var="pass"}</strong>
          </td>
          <td style="width:6px;"></td>
          <td style="padding:12px;background:#fee2e2;">
            <div style="font-size:12px;">FAILED</div>
            <strong style="font-size:24px;color:#991b1b;">\${TEST_COUNTS, var="fail"}</strong>
          </td>
          <td style="width:6px;"></td>
          <td style="padding:12px;background:#fef3c7;">
            <div style="font-size:12px;">SKIPPED</div>
            <strong style="font-size:24px;color:#92400e;">\${TEST_COUNTS, var="skip"}</strong>
          </td>
        </tr>
      </table>

      <div style="margin-top:28px;text-align:center;">
        <a href="${env.BUILD_URL}" style="display:inline-block;padding:13px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
          View Jenkins Build
        </a>
      </div>

      <p style="margin-top:18px;text-align:center;">
        <a href="${env.BUILD_URL}allure/" style="color:#2563eb;text-decoration:none;">Open Allure Report</a>
      </p>

      <p style="font-size:13px;color:#64748b;">
        The Playwright HTML report is available from the Jenkins build page when publishing succeeds.
      </p>
    </div>

    <div style="padding:18px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;">
      Automated notification from Jenkins<br/>
      Playwright UI &amp; API Automation
    </div>
  </div>
</body>
</html>
"""
                    )
                } catch (err) {
                    echo "Email notification failed: ${err}"
                }
            }
        }

        success {
            echo 'Playwright tests passed successfully.'
        }

        failure {
            echo 'Playwright tests failed. Check the reports for details.'
        }

        cleanup {
            cleanWs()
        }
    }
}
