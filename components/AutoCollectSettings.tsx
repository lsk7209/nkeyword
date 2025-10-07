"use client";

import { useState, useEffect } from 'react';
import { getAutoCollectConfig, saveAutoCollectConfig, type AutoCollectConfig } from '@/lib/storage';

interface Props {
  onConfigChange?: (config: AutoCollectConfig) => void;
}

export default function AutoCollectSettings({ onConfigChange }: Props) {
  const [config, setConfig] = useState<AutoCollectConfig>({
    enabled: false,
    maxDepth: 3,
    intervalMinutes: 10,
    batchSize: 5,
    targetCount: 0,
  });
  const [isCollecting, setIsCollecting] = useState(false);
  const [stats, setStats] = useState({ total: 0, unused: 0 });
  const [customTarget, setCustomTarget] = useState<string>('');

  useEffect(() => {
    setConfig(getAutoCollectConfig());
    
    // 통계 업데이트
    const updateStats = () => {
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem('nkeyword:dataset:v1');
        if (data) {
          const dataset = JSON.parse(data);
          const unused = dataset.filter((row: any) => !row.usedAsSeed).length;
          setStats({ total: dataset.length, unused });
        }
      }
    };
    
    updateStats();
    const interval = setInterval(updateStats, 5000); // 5초마다 업데이트
    
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const newConfig = { ...config, enabled: !config.enabled };
    setConfig(newConfig);
    saveAutoCollectConfig(newConfig);
    
    // 부모 컴포넌트에 변경 알림
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
    
    if (newConfig.enabled) {
      // 자동 수집 시작
      startAutoCollect();
    } else {
      console.log('[자동 수집] 사용자가 수동으로 중단');
    }
  };

  const handleConfigChange = (key: keyof AutoCollectConfig, value: number) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    saveAutoCollectConfig(newConfig);
    
    // 부모 컴포넌트에 변경 알림
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  const startAutoCollect = async () => {
    setIsCollecting(true);
    try {
      const response = await fetch('/api/keywords/auto-collect/start', {
        method: 'POST',
      });
      const data = await response.json();
      console.log('[자동 수집] 시작:', data);
    } catch (error) {
      console.error('[자동 수집] 시작 실패:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">자동 연관검색어 수집</h3>
          <p className="text-sm text-gray-500">
            저장된 키워드를 시드로 사용하여 자동으로 연관검색어를 수집합니다
          </p>
          <div className="mt-2 flex gap-4 text-xs text-gray-600">
            <span>전체: <strong>{stats.total.toLocaleString()}</strong>개</span>
            <span>미수집: <strong className="text-blue-600">{stats.unused.toLocaleString()}</strong>개</span>
            <span>수집완료: <strong className="text-green-600">{(stats.total - stats.unused).toLocaleString()}</strong>개</span>
            {config.targetCount && config.targetCount > 0 && (
              <span>목표: <strong className="text-purple-600">{config.targetCount.toLocaleString()}</strong>개 ({Math.round(stats.total / config.targetCount * 100)}%)</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleToggle}
            disabled={isCollecting}
            className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
              config.enabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50`}
          >
            {isCollecting ? '시작 중...' : config.enabled ? '🟢 ON' : '⚫ OFF'}
          </button>
          {config.enabled && (
            <p className="text-xs text-green-600 text-center">수집 중...</p>
          )}
        </div>
      </div>

      {config.enabled && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              최대 깊이
              <span className="ml-2 text-xs text-gray-500">
                (시드 → 1차 → 2차 → ...)
              </span>
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={config.maxDepth}
              onChange={(e) => handleConfigChange('maxDepth', parseInt(e.target.value))}
              className="w-20 rounded border px-2 py-1 text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              수집 간격 (분)
              <span className="ml-2 text-xs text-gray-500">
                (네이버 차단 방지)
              </span>
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={config.intervalMinutes}
              onChange={(e) => handleConfigChange('intervalMinutes', parseInt(e.target.value))}
              className="w-20 rounded border px-2 py-1 text-sm"
            />
          </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  배치 크기
                  <span className="ml-2 text-xs text-gray-500">
                    (한 번에 수집할 시드 개수)
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.batchSize}
                  onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                  className="w-20 rounded border px-2 py-1 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  목표 수집 개수
                  <span className="ml-2 text-xs text-gray-500">
                    (0 = 무제한)
                  </span>
                </label>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleConfigChange('targetCount', 0)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      config.targetCount === 0
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    무제한
                  </button>
                  <button
                    onClick={() => handleConfigChange('targetCount', 1000)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      config.targetCount === 1000
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    1,000개
                  </button>
                  <button
                    onClick={() => handleConfigChange('targetCount', 5000)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      config.targetCount === 5000
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    5,000개
                  </button>
                  <button
                    onClick={() => handleConfigChange('targetCount', 10000)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      config.targetCount === 10000
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    10,000개
                  </button>
                  <button
                    onClick={() => handleConfigChange('targetCount', 50000)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      config.targetCount === 50000
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    50,000개
                  </button>
                  <button
                    onClick={() => handleConfigChange('targetCount', 100000)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      config.targetCount === 100000
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    100,000개
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="직접 입력"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value)}
                    className="flex-1 rounded border px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => {
                      const value = parseInt(customTarget);
                      if (!isNaN(value) && value >= 0) {
                        handleConfigChange('targetCount', value);
                        setCustomTarget('');
                      }
                    }}
                    className="rounded bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700"
                  >
                    적용
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-md bg-blue-50 p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>작동 방식:</strong>
                  <br />
                  1. 데이터 메뉴의 키워드 중 미사용 시드를 선택
                  <br />
                  2. 해당 키워드로 연관검색어 수집
                  <br />
                  3. 수집된 키워드를 데이터에 추가 (중복 제거)
                  <br />
                  4. 사용된 시드는 체크 표시
                  <br />
                  5. 설정된 간격으로 반복
                  <br />
                  <br />
                  📊 <strong>문서수 수집:</strong>
                  <br />
                  • ON/OFF와 무관하게 자동 실행
                  <br />
                  • 키워드 추가 시 자동으로 백그라운드에서 수집
                  <br />
                  <br />
                  🛑 <strong>자동 종료:</strong>
                  <br />
                  • 목표 개수 달성 시 자동으로 OFF
                  <br />
                  • 미사용 시드키워드가 없으면 자동으로 OFF
                  <br />
                  • 수동으로 OFF 버튼 클릭
                </p>
              </div>
        </div>
      )}
    </div>
  );
}
