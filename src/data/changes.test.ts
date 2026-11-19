import { createChangeNotifier } from './changes';

describe('createChangeNotifier', () => {
  it('notify avisa a todos los oyentes suscritos', () => {
    const n = createChangeNotifier();
    const a = jest.fn();
    const b = jest.fn();
    n.subscribe(a);
    n.subscribe(b);
    n.notify();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('el oyente dado de baja ya no se llama', () => {
    const n = createChangeNotifier();
    const a = jest.fn();
    const off = n.subscribe(a);
    off();
    n.notify();
    expect(a).not.toHaveBeenCalled();
  });

  it('un oyente que lanza no impide avisar a los demás', () => {
    const n = createChangeNotifier();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const b = jest.fn();
    n.subscribe(() => {
      throw new Error('falla');
    });
    n.subscribe(b);
    expect(() => n.notify()).not.toThrow();
    expect(b).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('darse de baja dos veces es inofensivo', () => {
    const n = createChangeNotifier();
    const off = n.subscribe(jest.fn());
    off();
    expect(() => off()).not.toThrow();
  });
});
