export const mockCategories = [
  {
    key: 'planning',
    name: '1. 生产计划与调度管理 (MES/ERP)',
    algorithms: [
      { key: 'order-scheduling', name: '工单优先级动态排产调度' }
    ]
  },
  {
    key: 'formula',
    name: '2. 烟草配方与BOM管理',
    algorithms: [
      { key: 'blend-bom', name: '烟叶配方叶组投料比例计算' }
    ]
  },
  {
    key: 'logistics',
    name: '3. 智能仓储与物位寻路',
    algorithms: [
      { key: 'agv-routing', name: '立体库辅料AGV小车寻路' }
    ]
  },
  {
    key: 'monitoring',
    name: '4. 车间现场监控与反馈控制',
    algorithms: [
      { key: 'spc-weight', name: '高速卷包烟支克重在线检测与SPC控制' }
    ]
  }
];

export const mockAlgorithms = {
  'planning/order-scheduling': {
    categoryKey: 'planning',
    categoryName: '生产计划与调度管理 (MES/ERP)',
    algorithmKey: 'order-scheduling',
    algorithmName: '工单优先级动态排产调度',
    description: '模拟MES系统根据工单优先级、交货期以及设备状态，将待排产的烟草工单自动调度分配到相应的制丝线和卷包机组。',
    files: [
      {
        name: 'README.md',
        content: `# 工单优先级动态排产调度 (MES-Scheduling)

## 业务背景
在烟草生产过程中，生产计划的合理调度对提高设备稼动率(OEE)和满足烟草局订单交付非常关键。
本项目模拟在排产时，根据订单的**交货紧急度**与**客户信用等级**（对应 \\\`CeramicProject\\\` 中的 \\\`nr_z_kehu\\\` 和 \\\`nr_z_dd\\\` 数据），计算各工单的优先级分值，并将它们有序分配到制丝车间与卷包车间不同的流水线上。

## 对应 \\\`CeramicProject\\\` 数据库实体
- **nr_z_scd** (生产单主表): 存储生产工单单号、计划产量、状态。
- **nr_z_scd_cp** (生产单子表/产品): 工单对应的卷烟品牌型号与工艺参数。
- **nr_z_kehu** (客户信息表): 用于根据客户等级（例如核心商业公司还是普通专卖店）权重影响优先级调度。

## 调度算法逻辑
1. **数据读取**: 从 \\\`nr_z_scd\\\` 提取未排产工单队列。
2. **优先级计算**: \\\`Priority = (交期紧急度分值 * 0.6) + (客户等级权重 * 0.4)\\\`。
3. **优先级排序**: 对排产队列采用**优先级排序**（演示中使用优先级选择排序），将高优工单排在前面。
4. **设备资源分配**: 按照顺序，动态将工单指派给待机状态的制丝机组(1#)与卷包机组(1#/2#)。`
      },
      {
        name: 'code.js',
        content: `const { Array1DTracer, Array2DTracer, Layout, LogTracer, Tracer, VerticalLayout } = require('algorithm-visualizer');

const logTracer = new LogTracer('车间中控台日志');
const pendingTracer = new Array1DTracer('待排产工单队列 (按优先级降序)');
const lineTracer = new Array2DTracer('生产线排产计划 (制丝车间 -> 卷包车间)');

// 烟草生产工单数据 (来源于 CeramicProject nr_z_scd)
// 字段: 单号, 卷烟品牌, 计划生产量(箱), 优先级分值(交期紧急度 + 客户等级)
const rawOrders = [
  { id: 'WO-101', brand: '中华(硬)', qty: 150, priority: 85 },
  { id: 'WO-102', brand: '红塔山(硬经典)', qty: 300, priority: 60 },
  { id: 'WO-103', brand: '芙蓉王(硬)', qty: 220, priority: 95 },
  { id: 'WO-104', brand: '玉溪(软)', qty: 180, priority: 75 },
  { id: 'WO-105', brand: '黄鹤楼(软蓝)', qty: 250, priority: 90 }
];

(function main() {
  Layout.setRoot(new VerticalLayout([pendingTracer, lineTracer, logTracer]));
  
  logTracer.println('========== 智慧烟草生产调度系统 (MES-Scheduling) ==========');
  logTracer.println('正在从 核心数据库 (nr_z_scd) 读取待处理排产订单...');
  Tracer.delay();

  // 初始化待排产工单显示
  const pendingDisplay = rawOrders.map(o => \`\${o.id}:\${o.brand}(P\${o.priority})\`);
  pendingTracer.set(pendingDisplay);
  
  // 初始化生产线 (Line 1: 制丝车间, Line 2: 卷包车间 1#, Line 3: 卷包车间 2#)
  const productionLines = [
    ['[制丝线 1#]', '-', '-', '-', '-'],
    ['[卷包线 1#]', '-', '-', '-', '-'],
    ['[卷包线 2#]', '-', '-', '-', '-']
  ];
  lineTracer.set(productionLines);
  Tracer.delay();

  logTracer.println('开始执行【工单优先级动态调度算法】 (按优先级从高到低排产)...');
  
  // 执行优先级选择排序 (Simulating Priority Selection)
  const orders = [...rawOrders];
  for (let i = 0; i < orders.length; i++) {
    let maxIdx = i;
    pendingTracer.select(i);
    Tracer.delay();
    
    for (let j = i + 1; j < orders.length; j++) {
      pendingTracer.select(j);
      Tracer.delay();
      if (orders[j].priority > orders[maxIdx].priority) {
        pendingTracer.deselect(maxIdx);
        maxIdx = j;
        pendingTracer.select(maxIdx);
        Tracer.delay();
      } else {
        pendingTracer.deselect(j);
      }
    }
    
    if (maxIdx !== i) {
      // 交换位置
      const temp = orders[i];
      orders[i] = orders[maxIdx];
      orders[maxIdx] = temp;
      
      const tempDisp = pendingDisplay[i];
      pendingDisplay[i] = pendingDisplay[maxIdx];
      pendingDisplay[maxIdx] = tempDisp;
      
      pendingTracer.set(pendingDisplay);
      logTracer.println(\`[调度信息] 交换工单: \${orders[i].id} 提升到排程位置 \${i + 1}\`);
      Tracer.delay();
    }
    
    pendingTracer.deselect(maxIdx);
    pendingTracer.deselect(i);
  }

  logTracer.println('工单优先级排序完成，开始分配生产线资源...');
  Tracer.delay();

  // 模拟将排序好的工单分配到对应的车间流水线
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    pendingTracer.select(i);
    logTracer.println(\`\\n>> 工单 \${order.id} [\${order.brand}] 开始流转:\`);
    
    // 分配到制丝线 1#
    productionLines[0][i + 1] = \`\${order.id}\`;
    lineTracer.set(productionLines);
    lineTracer.select(0, i + 1);
    logTracer.println(\`   -> [制丝工段] 叶组配方投料计算与香精加温加湿切丝... (量: \${order.qty} 箱)\`);
    Tracer.delay();
    lineTracer.deselect(0, i + 1);

    // 分配到卷包线 1# 或 2#
    const lineIdx = (i % 2 === 0) ? 1 : 2;
    productionLines[lineIdx][i + 1] = \`\${order.id}\`;
    lineTracer.set(productionLines);
    lineTracer.select(lineIdx, i + 1);
    logTracer.println(\`   -> [卷包工段] 高速卷烟机滤嘴搭接与卷制... (线: \${lineIdx}#)\`);
    Tracer.delay();
    lineTracer.deselect(lineIdx, i + 1);
    
    pendingTracer.deselect(i);
  }
  
  logTracer.println(\`\\n========== 生产调度计算结束，生产计划表已生成完毕。 ==========\`);
})();`
      }
    ]
  },
  'formula/blend-bom': {
    categoryKey: 'formula',
    categoryName: '烟草配方与BOM管理',
    algorithmKey: 'blend-bom',
    algorithmName: '烟叶配方叶组投料比例计算',
    description: '模拟计算某品牌卷烟批次生产中，不同产地和等级烟叶、辅料及香精配方投料的重量，并与安全最低库存和采购状态自动校对。',
    files: [
      {
        name: 'README.md',
        content: `# 烟叶配方叶组投料比例计算 (Blend-BOM)

## 业务背景
每一款香烟（如中华、芙蓉王）在出厂前，都由资深调香配方师设计了一套复杂的**叶组配方BOM**。
制丝工艺的核心在于精细化投料与库存监控：不同的配方比重决定了烟支的味道，同时，核心香精香料和稀缺烟叶库存对排产有着直接制约。

## 对应 \\\`CeramicProject\\\` 数据库实体
- **nr_z_cpbom** (产品配方BOM表): 包含产品编号、原料编号、配比百分比等。
- **nr_z_wuliao** (物料基础表): 物料的当前库存（\\\`kucun\\\`）以及最低库存线（\\\`zuidkucun\\\`）。

## 算法投料校验逻辑
1. **获取BOM结构**: 从 \\\`nr_z_cpbom\\\` 读取当前卷烟品牌对应的配比组成（云南烤烟、贵州烤烟、进口烤烟、水松纸辅料、特殊香料）。
2. **计算预计用量**: 根据投料批次总量（例如 2000kg 烟丝），得出各种原料的预计消耗重量。
3. **库存校验**: 比对物料表 \\\`nr_z_wuliao\\\` 中的当前库存：
   - 若当前库存 < 预计消耗重量：提示“物料严重短缺，无法投产”；
   - 若剩余库存 < 最低安全库存（\\\`zuidkucun\\\`）：记录低库存预警，触发采购计划（\\\`nr_z_caigoudan\\\`）。`
      },
      {
        name: 'code.js',
        content: `const { Array2DTracer, ChartTracer, Layout, LogTracer, Tracer, VerticalLayout } = require('algorithm-visualizer');

const logTracer = new LogTracer('配方投料计算控制台');
const bomTracer = new Array2DTracer('配方物料构成表 (BOM - nr_z_cpbom)');
const chartTracer = new ChartTracer('各成分配比 (%) 与库存状态');

// 烟草配方BOM原料清单 (来源于 CeramicProject nr_z_wuliao & nr_z_cpbom)
// 字段: 物料名称, 目标配比(%), 库存(kg), 安全最低库存(kg), 单价(元/kg)
const bomData = [
  ['云南烤烟一等叶', '40', '12000', '3000', '120'],
  ['贵州烤烟二等叶', '25', '8000', '2500', '95'],
  ['津巴布韦进口叶', '15', '1800', '2000', '240'], // 库存低于安全库存，且本批次投料后会产生缺口
  ['水松纸/辅料', '18', '5000', '1500', '35'],
  ['特殊香精香料', '2', '500', '100', '650']
];

(function main() {
  Layout.setRoot(new VerticalLayout([bomTracer, chartTracer, logTracer]));
  
  logTracer.println('========== 烟草叶组配方比例计算与投料校验 ==========');
  logTracer.println('配方品牌: 【中华(硬) 叶组配方C3】');
  logTracer.println('批次生产总量: 2000 kg 烟丝');
  Tracer.delay();

  bomTracer.set(bomData);
  
  // 初始化图表: 投料配比
  const names = bomData.map(d => d[0]);
  const ratios = bomData.map(d => parseFloat(d[1]));
  chartTracer.set(ratios);
  Tracer.delay();

  logTracer.println('开始逐项校验原料库存状态 (比对安全库存 \`zuidkucun\`)...');
  
  let totalCost = 0;
  let hasStockShortage = false;

  for (let i = 0; i < bomData.length; i++) {
    const item = bomData[i];
    const name = item[0];
    const ratio = parseFloat(item[1]);
    const stock = parseFloat(item[2]);
    const minStock = parseFloat(item[3]);
    const price = parseFloat(item[4]);

    bomTracer.selectRow(i, 0, 4);
    logTracer.println(\`\\n校验原料 [\${name}]:\`);
    Tracer.delay();

    // 计算批次需求量
    const requiredWeight = (2000 * ratio) / 100;
    const cost = requiredWeight * price;
    totalCost += cost;

    logTracer.println(\`   -> 本批次计划用量: \${requiredWeight} kg (估算成本: ¥\${cost.toFixed(2)})\`);

    // 检查库存是否充足
    if (stock < requiredWeight) {
      logTracer.println(\`   🔴 [库存报警] 当前库存仅剩 \${stock} kg，低于本批投料量 \${requiredWeight} kg！无法正常投产！\`);
      hasStockShortage = true;
    } else {
      const remain = stock - requiredWeight;
      logTracer.println(\`   库存充足。扣减后预计剩余库存: \${remain} kg\`);
      
      // 检查扣减后是否低于安全库存
      if (remain < minStock) {
        logTracer.println(\`   ⚠️ [低库存警报] 扣减后库存 (\${remain} kg) 将低于最低库存限制 (\${minStock} kg)！已触发采购预申请流程。\`);
      }
    }
    Tracer.delay();
    bomTracer.deselectRow(i, 0, 4);
  }

  logTracer.println('\\n=======================================');
  logTracer.println(\`叶组配方投料计算完成。\`);
  logTracer.println(\`总材料成本估算: ¥\${totalCost.toFixed(2)}\`);
  if (hasStockShortage) {
    logTracer.println(\`❌ 【投料核验失败】配方存在库存绝对短缺物料，请向采购部门提交采购申请！\`);
  } else {
    logTracer.println(\`✅ 【投料核验成功】可以执行出库投料，制丝车间加料阀门已开启准备接收数据。\`);
  }
})();`
      }
    ]
  },
  'logistics/agv-routing': {
    categoryKey: 'logistics',
    categoryName: '智能仓储与物位寻路',
    algorithmKey: 'agv-routing',
    algorithmName: '立体库辅料AGV小车寻路',
    description: '模拟立体库中 AGV 智能配送车为高速卷包机组补充滤嘴棒及包装箱的路线规划，使用 Dijkstra 最短路径算法。',
    files: [
      {
        name: 'README.md',
        content: `# 立体库辅料AGV小车寻路 (AGV-Routing)

## 业务背景
现代烟草厂普遍采用全自动立体化仓库。
当高速卷包机组滤嘴棒或卷烟纸快用完时，系统向调度端发送辅料拉领申请。调度端派遣立体库的 AGV 小车从立体仓库出发，沿着地面预布设的磁条或激光反射节点网格，以最短耗时将物料安全送达工位。

## 对应 \\\`CeramicProject\\\` 数据库实体
- **nr_z_qtck** / **nr_z_cpck** (出库单): 记录出库详情与运送目的地。
- **nr_z_wuliao** (物料表): 出库核减物料信息。

## 寻路算法逻辑
1. **车间路网建模**: 使用拓扑图表达车间物流通道的交叉路口、转弯点及障碍区。
2. **起点与终点定义**: 起点为立体仓库原料出货口，终点为待补料的卷制机组工位。
3. **Dijkstra 最短路径计算**: 动态计算所有相连节点间的距离，求得最优避障配送路线，高亮显示小车行驶轨迹。`
      },
      {
        name: 'code.js',
        content: `const { GraphTracer, Layout, LogTracer, Tracer, VerticalLayout } = require('algorithm-visualizer');

const logTracer = new LogTracer('AGV智能寻路日志');
const graphTracer = new GraphTracer('立体仓库 -> 卷制车间 拓扑网格');

// 车间关键物流节点定义
const nodeNames = [
  '0:立体库原料区',
  '1:醇化库',
  '2:制丝车间入口',
  '3:卷包1#机组',
  '4:卷包2#机组',
  '5:包装线AGV接驳区'
];

(function main() {
  Layout.setRoot(new VerticalLayout([graphTracer, logTracer]));
  
  logTracer.println('========== AGV 智能小车配送路径规划 ==========');
  logTracer.println('物流任务: 【立体库原料区】 -> 【卷包2#机组】 配送辅料(滤嘴棒)');
  
  graphTracer.directed(false);
  graphTracer.weighted(true);

  // 添加车间节点
  for (let i = 0; i < nodeNames.length; i++) {
    graphTracer.addNode(i, null, 0, 0);
  }

  // 设定图的布局位置
  graphTracer.layoutCircle();
  Tracer.delay();

  // 添加配送路线与距离 (单位: 米)
  graphTracer.addEdge(0, 1, 15); // 立体库 -> 醇化库
  graphTracer.addEdge(0, 2, 40); // 立体库 -> 制丝
  graphTracer.addEdge(1, 2, 20); // 醇化库 -> 制丝
  graphTracer.addEdge(1, 3, 35); // 醇化库 -> 卷包1#
  graphTracer.addEdge(2, 4, 30); // 制丝 -> 卷包2#
  graphTracer.addEdge(3, 4, 10); // 卷包1# -> 卷包2#
  graphTracer.addEdge(3, 5, 25); // 卷包1# -> 包装线
  graphTracer.addEdge(4, 5, 15); // 卷包2# -> 包装线
  Tracer.delay();

  // 执行 Dijkstra 寻路算法
  const S = 0; // 起点 (立体库)
  const E = 4; // 终点 (卷包2#机组)
  const N = nodeNames.length;
  
  const dist = Array(N).fill(Infinity);
  const parent = Array(N).fill(-1);
  const visited = Array(N).fill(false);
  
  dist[S] = 0;
  graphTracer.updateNode(S, 0);
  logTracer.println(\`初始化起点 [\${nodeNames[S]}], 距离: 0\`);
  Tracer.delay();

  for (let iter = 0; iter < N; iter++) {
    let u = -1;
    for (let i = 0; i < N; i++) {
      if (!visited[i] && (u === -1 || dist[i] < dist[u])) {
        u = i;
      }
    }

    if (dist[u] === Infinity) break;

    visited[u] = true;
    graphTracer.visit(u, parent[u] !== -1 ? parent[u] : null);
    logTracer.println(\`\\n访问物流节点 [\${nodeNames[u]}], 当前累积路径长度: \${dist[u]}m\`);
    Tracer.delay();

    // 更新相邻节点的距离
    const edges = [
      [0, 1, 15], [0, 2, 40], [1, 2, 20], [1, 3, 35],
      [2, 4, 30], [3, 4, 10], [3, 5, 25], [4, 5, 15]
    ];

    for (const [s, t, w] of edges) {
      if (s === u || t === u) {
        const v = s === u ? t : s;
        if (!visited[v]) {
          const alt = dist[u] + w;
          if (alt < dist[v]) {
            dist[v] = alt;
            parent[v] = u;
            graphTracer.updateNode(v, dist[v]);
            logTracer.println(\`   -> 发现更短配送路线到 [\${nodeNames[v]}]: \${dist[v]}m (经由 [\${nodeNames[u]}])\`);
            Tracer.delay();
          }
        }
      }
    }
    graphTracer.leave(u, parent[u] !== -1 ? parent[u] : null);
  }

  // 绘制最终路径
  logTracer.println('\\n========== 最短配送路径计算完成 ==========');
  let curr = E;
  const path = [];
  while (curr !== -1) {
    path.push(curr);
    curr = parent[curr];
  }
  path.reverse();

  let pathStr = '';
  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    pathStr += (i === 0 ? '' : ' -> ') + nodeNames[node];
    if (i > 0) {
      graphTracer.select(node, parent[node]);
    }
  }
  logTracer.println(\`最佳配送线路: \${pathStr}\`);
  logTracer.println(\`总配送距离: \${dist[E]} 米\`);
})();`
      }
    ]
  },
  'monitoring/spc-weight': {
    categoryKey: 'monitoring',
    categoryName: '车间现场监控与反馈控制',
    algorithmKey: 'spc-weight',
    algorithmName: '高速卷包烟支克重在线检测与SPC控制',
    description: '模拟高速卷烟生产过程中在线红外质检仪对烟支重量的实时扫描、越界吹扫剔除，以及SPC控制图超限反馈逻辑。',
    files: [
      {
        name: 'README.md',
        content: `# 高速卷包烟支克重在线检测与SPC控制 (SPC-Weight)

## 业务背景
高速卷烟机在运行时，每分钟可生产高达 10,000 到 12,000 支香烟。
为了保证烟支的焦油释放量和吸味均匀一致，必须严密监控每一支香烟的**克重**（标准值通常在 950 毫克左右，允许误差范围 ±30 毫克）。
当质检仪（超声波或红外）发现超限烟支时，高速气动剔除阀会在毫秒级响应将其吹飞。
此外，通过 SPC 统计控制，如果发现烟支重量连续数个样本发生单向偏移，系统将智能给平割刀伺服电机发送位置微调指令，自适应调节烟丝进料速度。

## 对应 \\\`CeramicProject\\\` 数据库实体
- **nr_z_ypdj** (样品登记/工艺评级): SPC 采样分析记录和不良品统计。
- **nr_sys_rizhi** (系统运行日志): 质检设备报错与伺服联动控制的日志记录。

## SPC 判定与反馈控制逻辑
1. **实时检测**: 扫描并输入烟支重量采样。
2. **越界剔除**:
   - 若重量 > 980mg 或重量 < 920mg，发出剔除信号，控制气动阀，并累计不良品数。
3. **漂移识别 (SPC Rules)**:
   - 若检测到连续 5 支重量偏高（>953mg），表明喂料量过多，自动触发闭环反馈，微调调整喂料转速 -1.2%，降低重量。
4. **统计汇总**: 计算此批次的成品率。`
      },
      {
        name: 'code.js',
        content: `const { ChartTracer, Layout, LogTracer, Tracer, VerticalLayout } = require('algorithm-visualizer');

const logTracer = new LogTracer('高速卷制质检仪监控台');
const chartTracer = new ChartTracer('实时烟支克重质检监控 (UCL: 980mg, LCL: 920mg)');

// 连续采样的烟支重量数据 (单位: 毫克 mg)
const weights = [
  948, 952, 950, 946, 955, 960, 951, 949, 947, 953, // 1-10 (正常运行波动)
  985, // 11 (超出上限，需执行气动剔除)
  949, 950, 952, 
  912, // 15 (低于下限，需执行气动剔除)
  953, 955, 958, 962, 965, 968, 971, // 16-22 (重量持续漂移，触发反馈控制)
  950, 948, 951, 949, 952, 950
];

(function main() {
  Layout.setRoot(new VerticalLayout([chartTracer, logTracer]));
  
  logTracer.println('========== 卷烟克重在线高速监测与自适应控制 (SPC) ==========');
  logTracer.println('质检设备: PROTOS-M5 卷烟机在线红外/微波质检仪');
  logTracer.println('控制基准: 目标重量 950mg (允许偏差 ±30mg)');
  Tracer.delay();

  const chartData = [];
  chartTracer.set(chartData);
  Tracer.delay();

  let consecHighCount = 0;
  let rejectedCount = 0;

  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    chartData.push(weight);
    chartTracer.set(chartData);
    chartTracer.select(i);
    
    logTracer.println(\`[检测] 烟支 #\${i + 1} 重: \${weight} mg\`);

    if (weight > 980) {
      logTracer.println(\`   🔴 [重量超限] 烟支重量超出上限 (980mg)！自动触发气动阀门进行物理剔除。\`);
      rejectedCount++;
      consecHighCount = 0;
    } else if (weight < 920) {
      logTracer.println(\`   🔴 [重量超限] 烟支重量低于下限 (920mg)！自动触发气动阀门进行物理剔除。\`);
      rejectedCount++;
      consecHighCount = 0;
    } else {
      // 正常范围，检查是否持续偏高/偏低
      if (weight > 953) {
        consecHighCount++;
        if (consecHighCount >= 5) {
          logTracer.println(\`   ⚠️ [SPC预警] 连续 \${consecHighCount} 支重量偏高(漂移)。正在自动给平割刀电机发送微调指令，降低烟丝喂料量...\`);
          consecHighCount = 0; // 重置
        }
      } else {
        consecHighCount = 0;
      }
    }
    
    Tracer.delay();
    chartTracer.deselect(i);
  }

  logTracer.println('\\n========== 批次运行检测报告 ==========');
  logTracer.println(\`总检测烟支数: \${weights.length} 支\`);
  logTracer.println(\`剔除不合格烟支: \${rejectedCount} 支\`);
  logTracer.println(\`批次成品率: \${((weights.length - rejectedCount) / weights.length * 100).toFixed(2)}%\`);
  logTracer.println('数据已上传至 生产工艺质量库 nr_z_ypdj 归档。');
})();`
      }
    ]
  }
};
