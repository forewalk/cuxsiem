import json
import random
import time
from datetime import datetime, timedelta, timezone
from opensearchpy import OpenSearch
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

clients = [
    OpenSearch(
        hosts=[{'host': 'ns1.cruxdata.co.kr', 'port': 11723}],
        http_auth=('admin', 'admin'),
        use_ssl=False,
        verify_certs=False
    ),
    OpenSearch(
        hosts=[{'host': 'ns1.cruxdata.co.kr', 'port': 12023}],
        http_auth=('admin', 'admin'),
        use_ssl=True,
        verify_certs=False,
        ssl_show_warn=False
    )
]

def generate_mock_threat():
    now = datetime.now(timezone.utc)
    created_at = (now - timedelta(hours=random.randint(1, 48))).isoformat().replace('+00:00', 'Z')
    identified_at = (now - timedelta(hours=random.randint(1, 72))).isoformat().replace('+00:00', 'Z')
    registered_at = (now - timedelta(days=random.randint(1, 30))).isoformat().replace('+00:00', 'Z')
    scan_finished = (now - timedelta(hours=random.randint(1, 24))).isoformat().replace('+00:00', 'Z')
    scan_started = (now - timedelta(hours=random.randint(25, 48))).isoformat().replace('+00:00', 'Z')
    
    threat_names = ["malware.exe", "trojan.dll", "ransomware.bat", "suspicious.ps1", "backdoor.exe"]
    computer_names = [f"DESKTOP-{random.randint(100000, 999999)}" for _ in range(5)]
    usernames = ["admin", "user1", "user2", "system", "administrator"]
    
    mock_data = {
        "@timestamp": now.isoformat().replace('+00:00', 'Z'),
        "agentDetectionInfo": {
            "accountId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "accountName": "SentinelOne",
            "agentDetectionState": random.choice(["install_to_dynamic", "full_mode", "detect_mode"]),
            "agentDomain": "WORKGROUP",
            "agentIpV4": f"192.168.{random.randint(1,254)}.{random.randint(1,254)},172.16.{random.randint(1,254)}.{random.randint(1,254)}",
            "agentIpV6": f"fe80::{random.randint(1000,9999)}:{random.randint(1000,9999)}:{random.randint(1000,9999)}:{random.randint(1000,9999)}",
            "agentLastLoggedInUpn": None,
            "agentLastLoggedInUserMail": None,
            "agentLastLoggedInUserName": random.choice(usernames),
            "agentMitigationMode": random.choice(["detect", "protect"]),
            "agentOsName": random.choice(["Windows 11 Pro", "Windows 10 Enterprise", "Windows Server 2019"]),
            "agentOsRevision": str(random.randint(20000, 30000)),
            "agentRegisteredAt": registered_at,
            "agentUuid": ''.join(random.choices('0123456789abcdef', k=32)),
            "agentVersion": f"25.{random.randint(1,3)}.{random.randint(1,9)}.{random.randint(100,999)}",
            "assetVersion": "0",
            "cloudProviders": {},
            "externalIp": f"172.16.{random.randint(1,254)}.{random.randint(1,254)}",
            "groupId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "groupName": "Default group",
            "siteId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "siteName": random.choice(["Site-A", "Site-B", "Production"])
        },
        "agentRealtimeInfo": {
            "accountId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "accountName": "SentinelOne",
            "activeThreats": random.randint(0, 5),
            "agentComputerName": random.choice(computer_names),
            "agentDecommissionedAt": None,
            "agentDomain": "WORKGROUP",
            "agentId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "agentInfected": random.choice([True, False]),
            "agentIsActive": True,
            "agentIsDecommissioned": False,
            "agentMachineType": random.choice(["laptop", "desktop", "server"]),
            "agentMitigationMode": random.choice(["detect", "protect"]),
            "agentNetworkStatus": "connected",
            "agentOsName": random.choice(["Windows 11 Pro", "Windows 10 Enterprise"]),
            "agentOsRevision": str(random.randint(20000, 30000)),
            "agentOsType": "windows",
            "agentUuid": ''.join(random.choices('0123456789abcdef', k=32)),
            "agentVersion": f"25.{random.randint(1,3)}.{random.randint(1,9)}.{random.randint(100,999)}",
            "groupId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "groupName": "Default group",
            "networkInterfaces": [
                {
                    "id": str(random.randint(1000000000000000000, 9999999999999999999)),
                    "inet": [f"192.168.{random.randint(1,254)}.{random.randint(1,254)}"],
                    "inet6": [f"fe80::{random.randint(1000,9999)}:{random.randint(1000,9999)}:{random.randint(1000,9999)}:{random.randint(1000,9999)}"],
                    "name": "Ethernet",
                    "physical": ':'.join(['%02x' % random.randint(0, 255) for _ in range(6)])
                }
            ],
            "operationalState": "na",
            "rebootRequired": False,
            "scanAbortedAt": None,
            "scanFinishedAt": scan_finished,
            "scanStartedAt": scan_started,
            "scanStatus": random.choice(["finished", "started", "aborted"]),
            "siteId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "siteName": random.choice(["Site-A", "Site-B", "Production"]),
            "storageName": None,
            "storageType": None,
            "userActionsNeeded": []
        },
        "containerInfo": {
            "id": None,
            "image": None,
            "isContainerQuarantine": None,
            "labels": None,
            "name": None
        },
        "ecsInfo": {
            "clusterName": None,
            "serviceArn": None,
            "serviceName": None,
            "taskArn": None,
            "taskAvailabilityZone": None,
            "taskDefinitionArn": None,
            "taskDefinitionFamily": None,
            "taskDefinitionRevision": None,
            "type": None,
            "version": None
        },
        "id": str(random.randint(1000000000000000000, 9999999999999999999)),
        "indicators": [
            {
                "category": random.choice(["Evasion", "Malware", "Exploitation"]),
                "description": random.choice([
                    "Process executed with non-standard resource type",
                    "Detected suspicious redirection of data",
                    "Malicious behavior detected"
                ]),
                "ids": [random.randint(1, 3000)],
                "tactics": [
                    {
                        "name": random.choice(["Command and Control", "Defense Evasion", "Execution"]),
                        "source": "MITRE",
                        "techniques": [
                            {
                                "link": f"https://attack.mitre.org/techniques/T{random.randint(1000,1600)}",
                                "name": f"T{random.randint(1000,1600)}"
                            }
                        ]
                    }
                ]
            }
        ],
        "kubernetesInfo": {
            "cluster": None,
            "controllerKind": None,
            "controllerLabels": None,
            "controllerName": None,
            "isContainerQuarantine": None,
            "namespace": None,
            "namespaceLabels": None,
            "node": None,
            "nodeLabels": None,
            "pod": None,
            "podLabels": None
        },
        "mitigationStatus": [],
        "threatInfo": {
            "analystVerdict": "undefined",
            "analystVerdictDescription": "Undefined",
            "automaticallyResolved": False,
            "browserType": None,
            "certificateId": "",
            "classification": random.choice(["Malware", "Trojan", "Ransomware", "PUA"]),
            "classificationSource": random.choice(["Static", "Dynamic", "Cloud"]),
            "cloudFilesHashVerdict": None,
            "collectionId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "confidenceLevel": random.choice(["malicious", "suspicious", "n_a"]),
            "createdAt": created_at,
            "detectionEngines": [
                {
                    "key": "pre_execution_suspicious",
                    "title": "On-Write Static AI - Suspicious"
                }
            ],
            "detectionType": random.choice(["static", "dynamic", "behavioral"]),
            "engines": ["On-Write DFI - Suspicious"],
            "externalTicketExists": False,
            "externalTicketId": None,
            "failedActions": False,
            "fileExtension": random.choice(["EXE", "DLL", "BAT", "PS1"]),
            "fileExtensionType": "Executable",
            "filePath": f"\\Device\\HarddiskVolume{random.randint(1,10)}\\Users\\{random.choice(usernames)}\\AppData\\Local\\{random.choice(threat_names)}",
            "fileSize": random.randint(100000, 5000000),
            "fileVerificationType": random.choice(["NotSigned", "Signed"]),
            "identifiedAt": identified_at,
            "incidentStatus": random.choice(["unresolved", "resolved", "in_progress"]),
            "incidentStatusDescription": random.choice(["Unresolved", "Resolved", "In Progress"]),
            "initiatedBy": "agent_policy",
            "initiatedByDescription": "Agent Policy",
            "initiatingUserId": None,
            "initiatingUsername": None,
            "isFileless": False,
            "isValidCertificate": False,
            "macroModules": None,
            "maliciousProcessArguments": f"C:\\Users\\{random.choice(usernames)}\\AppData\\Local\\{random.choice(threat_names)}",
            "md5": None,
            "mitigatedPreemptively": False,
            "mitigationStatus": random.choice(["not_mitigated", "mitigated", "pending"]),
            "mitigationStatusDescription": random.choice(["Not mitigated", "Mitigated", "Pending"]),
            "originatorProcess": random.choice(["dfsvc.exe", "powershell.exe", "cmd.exe"]),
            "pendingActions": False,
            "processUser": f"{random.choice(computer_names)}\\{random.choice(usernames)}",
            "publisherName": "",
            "reachedEventsLimit": False,
            "rebootRequired": False,
            "rootProcessUpn": "",
            "sha1": ''.join(random.choices('0123456789abcdef', k=40)),
            "sha256": ''.join(random.choices('0123456789abcdef', k=64)),
            "storyline": ''.join(random.choices('0123456789ABCDEF', k=16)),
            "threatId": str(random.randint(1000000000000000000, 9999999999999999999)),
            "threatName": random.choice(threat_names),
            "updatedAt": now.isoformat().replace('+00:00', 'Z')
        },
        "whiteningOptions": ["hash", "path"]
    }
    
    return mock_data

def send_to_opensearch():
    index_name = "logs-sentinel_one.threats"
    i = 1
    
    while True:
        try:
            mock_threat = generate_mock_threat()
            
            for idx, client in enumerate(clients):
                try:
                    response = client.index(
                        index=index_name,
                        body=mock_threat,
                        refresh=True
                    )
                    print(f"[Client {idx+1}] Document {i} indexed: {response['_id']}")
                except Exception as e:
                    print(f"[Client {idx+1}] Error: {str(e)}")
            
            i += 1
            time.sleep(1)
            
        except KeyboardInterrupt:
            print("\n프로그램 종료")
            break

if __name__ == "__main__":
    send_to_opensearch()