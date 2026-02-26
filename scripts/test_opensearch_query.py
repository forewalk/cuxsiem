#!/usr/bin/env python3
"""
OpenSearch 쿼리 테스트 스크립트
알림 규칙과 동일한 쿼리로 실제 데이터가 있는지 확인
"""
import sys
import os
import json
from datetime import datetime

# 백엔드 모듈 import를 위한 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.opensearch import get_opensearch_client

def test_query():
    """알림 규칙과 동일한 쿼리로 데이터 확인"""
    client = get_opensearch_client()
    
    # 테스트할 인덱스
    index = "logs-sentinel_one.threats"
    
    # 알림 규칙과 동일한 쿼리
    query = {
        "query": {
            "bool": {
                "must": [{"match_all": {}}],
                "filter": [
                    {
                        "range": {
                            "@timestamp": {
                                "gte": "now-1m"
                            }
                        }
                    }
                ]
            }
        },
        "size": 10,
        "sort": [{"@timestamp": {"order": "desc"}}]
    }
    
    print(f"{'='*60}")
    print(f"OpenSearch 쿼리 테스트")
    print(f"{'='*60}")
    print(f"인덱스: {index}")
    print(f"쿼리: {json.dumps(query, indent=2, ensure_ascii=False)}")
    print(f"{'='*60}\n")
    
    try:
        # 쿼리 실행
        result = client.search(index=index, body=query)
        
        hits = result.get("hits", {}).get("hits", [])
        total = result.get("hits", {}).get("total", {}).get("value", 0)
        
        print(f"✓ 쿼리 성공!")
        print(f"  발견된 총 이벤트: {total}개")
        print(f"  반환된 결과: {len(hits)}개")
        
        if hits:
            print(f"\n{'='*60}")
            print("샘플 이벤트:")
            print(f"{'='*60}")
            for i, hit in enumerate(hits[:3], 1):
                source = hit.get("_source", {})
                timestamp = source.get("@timestamp", "N/A")
                print(f"\n[이벤트 {i}]")
                print(f"  ID: {hit.get('_id')}")
                print(f"  인덱스: {hit.get('_index')}")
                print(f"  타임스탬프: {timestamp}")
                
                # 주요 필드 출력
                if "agentDetectionInfo" in source:
                    agent_info = source["agentDetectionInfo"]
                    print(f"  에이전트: {agent_info.get('accountName', 'N/A')}")
                    print(f"  분류: {source.get('threatInfo', {}).get('classification', 'N/A')}")
        else:
            print(f"\n⚠ 최근 1분 이내에 이벤트가 없습니다")
            print(f"  쿼리 조건에 맞는 데이터가 없습니다.")
            print(f"\n  가능한 원인:")
            print(f"  1. 최근 1분 이내에 새로운 이벤트가 없음")
            print(f"  2. 인덱스 '{index}'가 존재하지 않거나 비어있음")
            print(f"  3. 데이터가 수집되지 않고 있음")
            
            # 전체 데이터 확인
            print(f"\n  인덱스의 전체 데이터 확인 중...")
            all_query = {"query": {"match_all": {}}, "size": 1}
            all_result = client.search(index=index, body=all_query)
            all_total = all_result.get("hits", {}).get("total", {}).get("value", 0)
            
            if all_total > 0:
                latest = all_result.get("hits", {}).get("hits", [])
                if latest:
                    latest_timestamp = latest[0].get("_source", {}).get("@timestamp", "N/A")
                    print(f"  ✓ 인덱스에 총 {all_total}개 이벤트 존재")
                    print(f"  ✓ 가장 최근 이벤트 시각: {latest_timestamp}")
            else:
                print(f"  ✗ 인덱스가 비어있거나 존재하지 않음")
                
    except Exception as e:
        print(f"✗ 쿼리 실패!")
        print(f"  오류: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = test_query()
    sys.exit(0 if success else 1)
