#!/usr/bin/env python3
# generate_dummy_agents_continuous.py

import json
import random
import time
from datetime import datetime, timedelta, timezone
from uuid import uuid4
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


def generate_agent():
    now = datetime.now(timezone.utc)
    agent_uuid = str(uuid4())
    agent_id = str(random.randint(2400000000000000000, 2499999999999999999))
    updated = now.isoformat().replace('+00:00', 'Z')
    created = (now - timedelta(days=random.randint(1, 90))).isoformat().replace('+00:00', 'Z')
    
    os_configs = [
        {"type": "windows", "name": "Windows 11 Pro", "revision": "26200", "arch": "64 bit"},
        {"type": "windows", "name": "Windows 10 Pro", "revision": "19045", "arch": "64 bit"},
        {"type": "linux", "name": "Linux", "revision": "Ubuntu 22.04.3 LTS 5.15.0-91-generic", "arch": "64 bit"},
        {"type": "linux", "name": "Linux", "revision": "Red Hat Enterprise Server release 8.9 4.18.0-513.el8.x86_64", "arch": "64 bit"}
    ]
    
    os_config = random.choice(os_configs)
    computer_names = [f"DESKTOP-TEST{random.randint(100,999)}", f"ini-{random.randint(20000000, 99999999)}", f"server-{random.randint(1,99):02d}"]
    group_names = ["사무실_목동", "운영서버", "테스트그룹", "개발팀"]
    
    agent = {
        "@timestamp": updated,
        "uuid": agent_uuid,
        "id": agent_id,
        "accountId": "2265215334396988960",
        "accountName": "SentinelOne",
        "computerName": random.choice(computer_names),
        "domain": random.choice(["WORKGROUP", "TESTDOMAIN", "unknown"]),
        "osType": os_config["type"],
        "osName": os_config["name"],
        "osRevision": os_config["revision"],
        "osArch": os_config["arch"],
        "machineType": random.choice(["desktop", "laptop", "server"]),
        "agentVersion": random.choice(["24.2.2.20", "24.1.6.313", "25.1.4.434"]),
        "isActive": random.choice([True, True, True, False]),
        "networkStatus": random.choice(["connected", "connected", "connected", "disconnected"]),
        "activeThreats": random.randint(0, 5),
        "infected": random.choice([True, False, False, False]),
        "groupId": f"240716{random.randint(1000000000, 9999999999)}",
        "groupName": random.choice(group_names),
        "siteId": "2265215334849973795",
        "siteName": "0.이니넥스트",
        "externalIp": f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
        "lastIpToMgmt": f"172.16.{random.randint(1,254)}.{random.randint(1,254)}",
        "lastActiveDate": updated,
        "updatedAt": updated,
        "createdAt": created,
        "registeredAt": created,
        "coreCount": random.choice([2, 4, 6, 8, 16]),
        "cpuCount": random.choice([1, 2]),
        "cpuId": random.choice([
            "Intel(R) Core(TM) i7-1165G7 @ 2.80GHz",
            "Intel(R) Core(TM) i5-9600K CPU @ 3.70GHz",
            "Intel(R) Xeon(R) CPU E5620 @ 2.40GHz"
        ]),
        "totalMemory": random.choice([8192, 16065, 16107, 32427]),
        "networkInterfaces": [
            {
                "id": f"{random.randint(2400000000000000000, 2499999999999999999)}",
                "inet": [f"172.16.{random.randint(1,254)}.{random.randint(1,254)}"],
                "inet6": [f"fe80::{random.randint(1000,9999):04x}:{random.randint(1000,9999):04x}:{random.randint(1000,9999):04x}:{random.randint(1000,9999):04x}"],
                "name": random.choice(["eth0", "eth1", "이더넷", "이더넷 3"]),
                "physical": f"{random.randint(0,255):02x}:{random.randint(0,255):02x}:{random.randint(0,255):02x}:{random.randint(0,255):02x}:{random.randint(0,255):02x}:{random.randint(0,255):02x}".upper(),
                "gatewayIp": f"172.16.{random.randint(1,254)}.254" if random.choice([True, False]) else None,
                "gatewayMacAddress": f"00:09:0f:09:00:{random.randint(1,99):02d}" if random.choice([True, False]) else None
            }
        ],
        "activeDirectory": {
            "computerDistinguishedName": None,
            "computerMemberOf": [],
            "lastUserDistinguishedName": None,
            "lastUserMemberOf": [],
            "userPrincipalName": None
        },
        "activeProtection": ["edr"],
        "allowRemoteShell": False,
        "appsVulnerabilityStatus": random.choice(["up_to_date", "not_applicable"]),
        "cloudProviders": {},
        "consoleMigrationStatus": "N/A",
        "containerizedWorkloadCounts": None,
        "detectionState": random.choice(["full_mode", None]),
        "encryptedApplications": False,
        "externalId": "",
        "firewallEnabled": False,
        "fullDiskScanLastUpdatedAt": (now - timedelta(hours=2)).isoformat().replace('+00:00', 'Z'),
        "groupIp": f"172.16.{random.randint(1,254)}.x",
        "hasContainerizedWorkload": False,
        "inRemoteShellSession": False,
        "installerType": random.choice([".msi", ".rpm", ".pkg"]),
        "isAdConnector": False,
        "isDecommissioned": False,
        "isPendingUninstall": False,
        "isUninstalled": False,
        "isUpToDate": random.choice([True, False]),
        "lastLoggedInUserName": random.choice(["user", "admin", "root", "임승택", ""]),
        "licenseKey": "",
        "locationEnabled": random.choice([True, False]),
        "locationType": random.choice(["fallback", "not_supported"]),
        "missingPermissions": [],
        "mitigationMode": "detect",
        "mitigationModeSuspicious": "detect",
        "modelName": random.choice(["HP ProLiant DL360 G7", "SAMSUNG ELECTRONICS CO., LTD. - 550XDA", "To Be Filled By O.E.M."]),
        "networkQuarantineEnabled": False,
        "operationalState": "na",
        "osStartTime": (now - timedelta(hours=random.randint(1, 72))).isoformat().replace('+00:00', 'Z'),
        "osUsername": random.choice([None, "root", "administrator"]),
        "rangerStatus": random.choice(["Enabled", "Disabled"]),
        "remoteProfilingState": "disabled",
        "scanStatus": random.choice(["finished", "aborted", "started"]),
        "showAlertIcon": False,
        "tags": {"sentinelone": []},
        "threatRebootRequired": False,
        "userActionsNeeded": []
    }
    
    return agent

def send_to_opensearch():
    index_name = "logs-sentinel_one.agents"
    i = 1
    
    print("Agents 더미 데이터 생성 시작")
    print("중지하려면 Ctrl+C를 누르세요\n")
    
    try:
        while True:
            agent = generate_agent()
            
            for idx, client in enumerate(clients):
                try:
                    response = client.index(
                        index=index_name,
                        id=agent["uuid"],  # uuid를 _id로 사용
                        body=agent,
                        refresh=False
                    )
                    print(f"[Client {idx+1}] Agent {i} indexed: {agent['computerName']} (uuid: {agent['uuid'][:8]}...)")
                except Exception as e:
                    print(f"[Client {idx+1}] Error: {str(e)}")
            
            i += 1
            time.sleep(2)  # 2초 간격
            
    except KeyboardInterrupt:
        print(f"\n\n프로그램 종료. 총 {i-1}개 생성")

if __name__ == "__main__":
    send_to_opensearch()