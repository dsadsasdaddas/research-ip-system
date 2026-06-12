import { RustSearchDoc } from './rust-search-adapter';

// RustSearchAdapter 经 jest.doMock 后会重新求值出一个新的 class,故按需取用。
type RustSearchAdapterType = InstanceType<
  typeof import('./rust-search-adapter').RustSearchAdapter
>;

// Module.createRequire 的 mock：拦截 requireNative(addonPath)
const mockSearch = jest.fn();
const moduleCreateRequire = jest.requireActual('module').createRequire;

describe('RustSearchAdapter', () => {
  beforeEach(() => {
    jest.resetModules();
    mockSearch.mockReset();
  });

  /** 用被测文件自己的 require(即 __filename 真实路径)造 requireNative,
   *  然后让 requireNative(path) 返回我们的 native mock。 */
  function buildAdapter(nativeModule: unknown): RustSearchAdapterType {
    jest.doMock('module', () => {
      const actual = jest.requireActual('module');
      return {
        ...actual,
        createRequire: jest.fn().mockImplementation(() => {
          const req = (p: string) => {
            if (typeof p === 'string' && p.endsWith('index.node'))
              return nativeModule;
            return moduleCreateRequire(__filename)(p);
          };
          return req;
        }),
      };
    });

    const mod = require('./rust-search-adapter');
    return new mod.RustSearchAdapter() as RustSearchAdapterType;
  }

  /** doMock 后重新求值的 class,仅用于 toBeInstanceOf 断言 */
  function adapterClass(): unknown {
    return require('./rust-search-adapter').RustSearchAdapter;
  }

  const docs: RustSearchDoc[] = [
    { id: 1, type: 'paper', title: '量子计算', content: '量子 计算 论文' },
    { id: 2, type: 'patent', title: '量子陀螺', content: '量子 陀螺' },
  ];

  describe('构造(native module 校验)', () => {
    it('exports.search 是函数 → 加载成功', () => {
      mockSearch.mockReturnValue('[]');
      const adapter = buildAdapter({ search: mockSearch });
      expect(adapter).toBeInstanceOf(adapterClass());
    });

    it('loadedModule 非 object → 抛错', () => {
      expect(() => buildAdapter(null)).toThrow(/Invalid Rust search addon/);
    });

    it('loadedModule 无 search 函数 → 抛错', () => {
      expect(() => buildAdapter({ search: 'not-a-fn' })).toThrow(
        /Invalid Rust search addon/,
      );
      expect(() => buildAdapter({})).toThrow(/Invalid Rust search addon/);
    });
  });

  describe('search', () => {
    it('原生返回标准 hits → 透传(含 score/type 过滤)', () => {
      const payload = [
        { id: 1, type: 'paper', title: '量子计算', score: 1.5 },
        { id: 2, type: 'patent', title: '量子陀螺', score: 0.8 },
      ];
      mockSearch.mockReturnValue(JSON.stringify(payload));
      const adapter = buildAdapter({ search: mockSearch });

      const hits = adapter.search(docs, '量子');
      expect(mockSearch).toHaveBeenCalledWith(JSON.stringify(docs), '量子');
      expect(hits).toEqual(payload);
      expect(hits).toHaveLength(2);
    });

    it('原生返回的元素缺字段 → 被 isRustSearchHit 过滤掉', () => {
      const payload = [
        { id: 1, type: 'paper', title: '量子计算', score: 1.5 }, // 合法
        { id: 'x', type: 'paper', title: 't', score: 1 }, // id 非 number
        { id: 2, type: 'unknown', title: 't', score: 1 }, // type 非法
        { id: 3, type: 'patent', title: 9, score: 1 }, // title 非 string
        { id: 4, type: 'patent', title: 't', score: 'big' }, // score 非 number
        { id: 5, type: 'copyright', title: 't' }, // 缺 score
      ];
      mockSearch.mockReturnValue(JSON.stringify(payload));
      const adapter = buildAdapter({ search: mockSearch });

      const hits = adapter.search(docs, '量子');
      expect(hits).toHaveLength(1);
      expect(hits[0].id).toBe(1);
    });

    it('原生返回的元素为 null → 过滤掉(isRustSearchHit 的 null 分支)', () => {
      const payload = [null, { id: 1, type: 'paper', title: 't', score: 1 }];
      mockSearch.mockReturnValue(JSON.stringify(payload));
      const adapter = buildAdapter({ search: mockSearch });
      const hits = adapter.search(docs, '量子');
      expect(hits).toHaveLength(1);
    });

    it('原生返回非数组 JSON → 抛错', () => {
      mockSearch.mockReturnValue(JSON.stringify({ a: 1 }));
      const adapter = buildAdapter({ search: mockSearch });
      expect(() => adapter.search(docs, '量子')).toThrow(/non-array JSON/);
    });

    it('原生返回空数组 → 返回空', () => {
      mockSearch.mockReturnValue('[]');
      const adapter = buildAdapter({ search: mockSearch });
      expect(adapter.search(docs, '量子')).toEqual([]);
    });

    it('原生返回非法 JSON → JSON.parse 抛错透传', () => {
      mockSearch.mockReturnValue('not-json{');
      const adapter = buildAdapter({ search: mockSearch });
      expect(() => adapter.search(docs, '量子')).toThrow();
    });
  });
});
