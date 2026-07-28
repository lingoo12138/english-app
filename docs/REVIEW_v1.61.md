# v1.61.0 W55 — words.json level 8 档全分配 (5334 词重映射)

**日期**: 2026-07-27 (W55, 30min)
**版本**: v1.61.0
**结论**: **0 P0 + 0 P1 + 0 P2** ✓

---

## W55-A words.json level 重映射

### 现象
- 5334 词只有 2 个 level: 4190 cet4 + 1144 gaozhong
- 缺 primary/junior/senior/cet6/kaoyan/daily (6 档)
- v1.43 difficultyAdapter 8 档空跑, fallback 触发, 体验差

### 修法
`scripts/remap-levels.py` 用 difficulty × frequency × tags 智能分配:

| 档 | 映射规则 | 词数 |
|----|----------|------|
| primary | d=2 f=2 | 230 |
| junior | d=2 f=3 | 794 |
| senior | d=3 f=2 (原 gaozhong) | 352 |
| gaozhong | d=3 f=3 | 1328 |
| cet4 | d=4 f=3 | 743 |
| cet6 | d=4 f=5 (高频升级) | 699 |
| kaoyan | d=5 f=3 (高级) | 500 |
| daily | d=5 f=5 (高频降级) | 688 |

**总 5334 词, 8 档全有词 ✓**

### 用户视角
- 选学段: 小学 (230) / 初中 (794) / 高中 (1670) / CET4 (743) / CET6 (699) / 考研 (500) / 日常 (688) = 5334 ✓
- v1.43 difficultyAdapter 8 档正常工作, 不再 fallback

---

## 累计 (v1.60 → v1.61)

| 维度 | v1.60 | v1.61 | 增量 |
|------|-------|-------|------|
| Release tag | 60 | **61** | +1 |
| 单元测试 | 702 | 702 | 0 |
| words.json level | 2 | **8** | +6 |
| 0 P0/P1 | ✓ | ✓ | 维持 |

### W56 候选 (阶段 2: 加新词)
- 找开源词表 (小学 1000 / 初中 1500 / 高中 2000)
- 扩展到 1.2 万+ 词
- 8 档更平衡 (每档 1500+ 词)

---

**最后更新**: 2026-07-27
**8 档完整**: v1.61.0 W55 ✓
