pipeline {
    agent any

    tools {
        // Configure a NodeJS installation named 'Node20' in Jenkins > Global Tool Configuration
        nodejs 'Node20'
    }

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['qa', 'dev', 'staging'],
            description: 'Framework environment to test'
        )
        choice(
            name: 'BROWSER',
            choices: ['all', 'chromium', 'firefox', 'webkit'],
            description: 'Browser project(s) to run; all runs Chromium, Firefox, and WebKit'
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
        ansiColor('xterm')
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
                    def projectFlag = params.BROWSER == 'all' ? '' : "--project=${params.BROWSER}"
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

        stage('Generate Allure Report') {
            steps {
                sh 'npm run allure:generate'
            }
        }
    }

    post {
        always {
            // Publish JUnit results
            junit allowEmptyResults: true, testResults: 'reports/junit-report/results.xml'

            // Publish Allure report (requires the Allure Jenkins plugin)
            allure([
                includeProperties: false,
                jdk: '',
                results: [[path: 'reports/allure-results']]
            ])

            // Archive HTML report + artifacts
            archiveArtifacts artifacts: 'reports/**, test-results/**', allowEmptyArchive: true

            // Publish Playwright HTML report (requires HTML Publisher plugin)
            publishHTML(target: [
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'reports/html-report',
                reportFiles: 'index.html',
                reportName: 'Playwright HTML Report'
            ])

            emailext(
                subject: "Playwright Build #${env.BUILD_NUMBER} - ${currentBuild.currentResult}",
                body: """Build Status : ${currentBuild.currentResult}

Job Name     : ${env.JOB_NAME}
Build Number : ${env.BUILD_NUMBER}
Environment  : ${params.ENVIRONMENT}
Browser      : ${params.BROWSER}
Suite        : ${params.SUITE}

Test Results:
Total        : \${TEST_COUNTS, var="total"}
Passed       : \${TEST_COUNTS, var="pass"}
Failed       : \${TEST_COUNTS, var="fail"}
Skipped      : \${TEST_COUNTS, var="skip"}

Build URL:
${env.BUILD_URL}

Allure Report:
${env.BUILD_URL}allure/

Regards,
Jenkins
""",
                to: 'ranjeetkendre1995@gmail.com'
            )
        }
        success {
            echo 'Tests passed successfully.'
        }
        failure {
            echo 'Some tests failed. Check the reports for details.'
        }
        cleanup {
            cleanWs()
        }
    }
}