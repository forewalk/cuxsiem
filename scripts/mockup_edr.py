import json
import random
import time
from datetime import datetime, timezone, timedelta
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

def generate_mock_edr():
    now = datetime.now(timezone.utc)
    event_time = int(now.timestamp() * 1000)
    start_time = int((now - timedelta(hours=random.randint(1, 24))).timestamp() * 1000)
    
    processes = ["powershell.exe", "cmd.exe", "explorer.exe", "svchost.exe", "chrome.exe"]
    users = ["SYSTEM", "Administrator", "user1", "user2"]
    event_types = ["Process Creation", "File Modification", "Registry Change", "Network Connection", "DNS Query"]
    
    mock_data = {
        "@timestamp": now.isoformat().replace('+00:00', 'Z'),
        "timestamp": event_time,
        "agent": {
            "uuid": ''.join(random.choices('0123456789abcdef', k=32)),
            "version": f"25.{random.randint(1,3)}.{random.randint(1,9)}.{random.randint(100,999)}"
        },
        "endpoint": {
            "name": f"DESKTOP-{random.randint(100000, 999999)}",
            "os": random.choice(["Windows 11 Pro", "Windows 10 Enterprise", "Windows Server 2019"]),
            "type": random.choice(["laptop", "desktop", "server"])
        },
        "event": {
            "type": random.choice(event_types),
            "category": random.choice(["process", "file", "network", "registry"]),
            "time": event_time,
            "repetitionCount": random.randint(1, 5)
        },
        "src": {
            "process": {
                "name": random.choice(processes),
                "pid": random.randint(1000, 65000),
                "uid": ''.join(random.choices('0123456789ABCDEF', k=16)),
                "cmdline": f"C:\\Windows\\System32\\{random.choice(processes)}",
                "user": random.choice(users),
                "userSid": f"S-1-5-{random.randint(18,21)}-{random.randint(1000000000,9999999999)}",
                "startTime": start_time,
                "isStorylineRoot": random.choice([True, False]),
                "isNative64Bit": True,
                "isRedirectCmdProcessor": False,
                "integrityLevel": random.choice(["high", "medium", "low", "system"]),
                "subsystem": "SYS_WIN32",
                "signedStatus": random.choice(["signed", "unsigned"]),
                "verifiedStatus": random.choice(["verified", "unverified"]),
                "displayName": random.choice(processes),
                "sessionId": random.randint(0, 5),
                "childProcCount": random.randint(0, 10),
                "netConnCount": random.randint(0, 50),
                "netConnInCount": random.randint(0, 25),
                "netConnOutCount": random.randint(0, 25),
                "dnsCount": random.randint(0, 20),
                "registryChangeCount": random.randint(0, 15),
                "tgtFileCreationCount": random.randint(0, 10),
                "tgtFileModificationCount": random.randint(0, 10),
                "tgtFileDeletionCount": random.randint(0, 5),
                "crossProcessCount": random.randint(0, 5),
                "indicatorEvasionCount": random.randint(0, 3),
                "indicatorExploitationCount": random.randint(0, 2),
                "indicatorInjectionCount": random.randint(0, 2),
                "indicatorPersistenceCount": random.randint(0, 2),
                "indicatorRansomwareCount": random.randint(0, 1),
                "indicatorGeneralCount": random.randint(0, 5),
                "storyline": {
                    "id": ''.join(random.choices('0123456789ABCDEF', k=16))
                },
                "image": {
                    "path": f"C:\\Windows\\System32\\{random.choice(processes)}",
                    "sha1": ''.join(random.choices('0123456789abcdef', k=40)),
                    "sha256": ''.join(random.choices('0123456789abcdef', k=64)),
                    "md5": ''.join(random.choices('0123456789abcdef', k=32)),
                    "size": random.randint(100000, 5000000),
                    "extension": "exe",
                    "binaryIsExecutable": True,
                    "uid": ''.join(random.choices('0123456789ABCDEF', k=16))
                },
                "parent": {
                    "pid": random.randint(100, 10000),
                    "name": "services.exe",
                    "uid": ''.join(random.choices('0123456789ABCDEF', k=16)),
                    "cmdline": "C:\\Windows\\System32\\services.exe",
                    "user": "SYSTEM",
                    "startTime": start_time - 1000000,
                    "isStorylineRoot": True,
                    "isNative64Bit": True,
                    "storyline": {
                        "id": ''.join(random.choices('0123456789ABCDEF', k=16))
                    },
                    "image": {
                        "path": "C:\\Windows\\System32\\services.exe",
                        "sha1": ''.join(random.choices('0123456789abcdef', k=40)),
                        "sha256": ''.join(random.choices('0123456789abcdef', k=64)),
                        "size": random.randint(100000, 1000000),
                        "extension": "exe",
                        "binaryIsExecutable": True
                    }
                }
            },
            "ip": {
                "address": f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
            },
            "port": {
                "number": random.randint(1024, 65535)
            }
        },
        "dst": {
            "ip": {
                "address": f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"
            },
            "port": {
                "number": random.choice([80, 443, 8080, 3389, 22, 445])
            }
        },
        "site": {
            "id": str(random.randint(1000000000000000000, 9999999999999999999))
        },
        "account": {
            "id": str(random.randint(1000000000000000000, 9999999999999999999))
        },
        "group": {
            "id": str(random.randint(1000000000000000000, 9999999999999999999)),
            "type": "static"
        },
        "mgmt": {
            "url": "https://usea1-purple.sentinelone.net",
            "osRevision": str(random.randint(20000, 30000))
        },
        "dataSource": {
            "name": "SentinelOne",
            "category": "security"
        },
        "meta": {
            "event": {
                "name": random.choice(event_types)
            }
        }
    }
    
    return mock_data

def send_to_opensearch():
    index_name = "logs-sentinel_one.edr"
    i = 1
    
    while True:
        try:
            mock_edr = generate_mock_edr()
            
            for idx, client in enumerate(clients):
                try:
                    response = client.index(
                        index=index_name,
                        body=mock_edr,
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
