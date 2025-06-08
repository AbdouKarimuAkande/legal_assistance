
pipeline {
    agent any
    
    environment {
        DOCKER_HUB_CREDENTIALS = credentials('docker-hub-credentials')
        KUBECONFIG = credentials('kubeconfig')
        SONAR_TOKEN = credentials('sonar-token')
        NOTIFICATION_EMAIL = 'devops@lawhelp.cm'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.BUILD_NUMBER = "${BUILD_NUMBER}"
                    env.GIT_COMMIT = sh(returnStdout: true, script: 'git rev-parse HEAD').trim()
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
                sh 'cd microservices/auth-service && npm ci'
                sh 'cd microservices/chat-service && npm ci'
            }
        }
        
        stage('Code Quality & Security Scan') {
            parallel {
                stage('ESLint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('SonarQube Analysis') {
                    steps {
                        withSonarQubeEnv('SonarQube') {
                            sh 'sonar-scanner'
                        }
                    }
                }
                stage('Security Scan') {
                    steps {
                        sh 'npm audit --audit-level moderate'
                        sh 'npx snyk test --severity-threshold=high'
                    }
                }
            }
        }
        
        stage('Run Tests') {
            parallel {
                stage('Unit Tests') {
                    steps {
                        sh 'npm run test:unit'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'test-results/unit/*.xml'
                            publishCoverageResults pattern: 'coverage/lcov.info'
                        }
                    }
                }
                stage('Integration Tests') {
                    steps {
                        sh 'npm run test:integration'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'test-results/integration/*.xml'
                        }
                    }
                }
                stage('E2E Tests') {
                    steps {
                        sh 'npm run test:e2e'
                    }
                    post {
                        always {
                            publishTestResults testResultsPattern: 'test-results/e2e/*.xml'
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Images') {
            steps {
                script {
                    sh 'docker build -t lawhelp/frontend:${BUILD_NUMBER} .'
                    sh 'docker build -t lawhelp/auth-service:${BUILD_NUMBER} ./microservices/auth-service'
                    sh 'docker build -t lawhelp/chat-service:${BUILD_NUMBER} ./microservices/chat-service'
                    sh 'docker build -t lawhelp/ai-model:${BUILD_NUMBER} ./ai-model'
                }
            }
        }
        
        stage('Security Scan Images') {
            steps {
                script {
                    sh 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image lawhelp/frontend:${BUILD_NUMBER}'
                    sh 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image lawhelp/auth-service:${BUILD_NUMBER}'
                    sh 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image lawhelp/chat-service:${BUILD_NUMBER}'
                }
            }
        }
        
        stage('Push to Registry') {
            steps {
                script {
                    docker.withRegistry('https://registry.hub.docker.com', 'docker-hub-credentials') {
                        sh 'docker push lawhelp/frontend:${BUILD_NUMBER}'
                        sh 'docker push lawhelp/auth-service:${BUILD_NUMBER}'
                        sh 'docker push lawhelp/chat-service:${BUILD_NUMBER}'
                        sh 'docker push lawhelp/ai-model:${BUILD_NUMBER}'
                        
                        // Tag as latest
                        sh 'docker tag lawhelp/frontend:${BUILD_NUMBER} lawhelp/frontend:latest'
                        sh 'docker tag lawhelp/auth-service:${BUILD_NUMBER} lawhelp/auth-service:latest'
                        sh 'docker tag lawhelp/chat-service:${BUILD_NUMBER} lawhelp/chat-service:latest'
                        sh 'docker tag lawhelp/ai-model:${BUILD_NUMBER} lawhelp/ai-model:latest'
                        
                        sh 'docker push lawhelp/frontend:latest'
                        sh 'docker push lawhelp/auth-service:latest'
                        sh 'docker push lawhelp/chat-service:latest'
                        sh 'docker push lawhelp/ai-model:latest'
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            steps {
                script {
                    sh '''
                        kubectl config use-context staging
                        helm upgrade --install lawhelp-staging ./helm \
                            --namespace lawhelp-staging \
                            --create-namespace \
                            --set image.tag=${BUILD_NUMBER} \
                            --set environment=staging \
                            --wait
                    '''
                }
            }
        }
        
        stage('Staging Tests') {
            steps {
                sh 'npm run test:staging'
                sh 'npm run test:performance'
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'
                script {
                    sh '''
                        kubectl config use-context production
                        helm upgrade --install lawhelp ./helm \
                            --namespace lawhelp \
                            --create-namespace \
                            --set image.tag=${BUILD_NUMBER} \
                            --set environment=production \
                            --wait
                    '''
                }
            }
        }
    }
    
    post {
        always {
            sh 'docker system prune -f'
            archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'coverage',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
        }
        success {
            emailext (
                subject: "✅ Build Success: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Build ${env.BUILD_NUMBER} completed successfully. Deployed to production.",
                to: "${NOTIFICATION_EMAIL}"
            )
        }
        failure {
            emailext (
                subject: "❌ Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Build ${env.BUILD_NUMBER} failed. Please check the console output.",
                to: "${NOTIFICATION_EMAIL}"
            )
        }
    }
}
