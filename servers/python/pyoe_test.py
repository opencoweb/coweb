
from cowebpyoe.OTEngine import OTEngine

class OTClient:
    def __init__(self, id):
        self.id = id
        self.ot = OTEngine(id)
        self.list = []
        self.queue = None
    def start(self):
        if (self.queue == None):
            raise Exception("Already started!")
        for i in range(len(self.queue)):
            v = self.queue[i]
            self._apply(self.ot.remoteEvent(v[0], v[1]))
        self.queue = None
    def stop(self):
        if (self.queue != None):
            raise Exception("Already stopped!")
        self.queue = []
    def insert(self, pos, val):
        if (pos < 0 or pos > len(self.list)):
            raise Exception("Out of bounds!")
        self.list.insert(pos, val)
        op = self.ot.createOp("list", val, "insert", pos)
        return self.ot.localEvent(op)
    def update(self, pos, val):
        if (pos < 0 or pos >= len(self.list)):
            raise Exception("Out of bounds!")
        self.list[pos] = val
        op = self.ot.createOp("list", val, "update", pos)
        return self.ot.localEvent(op)
    def delete(self, pos):
        if (pos < 0 or pos >= len(self.list)):
            raise Exception("Out of bounds!")
        self.list.pop(pos)
        op = self.ot.createOp("list", None, "delete", pos)
        return self.ot.localEvent(op)
    def remote(self, order, op):
        if (self.queue != None):
            self.queue.append((order, op))
        else:
            self._apply(self.ot.remoteEvent(order, op))
    def _apply(self, op):
        type = op["type"]
        position = op["position"]
        value = op["value"]
        if ("insert" == type):
            self.list.insert(position, value)
        elif ("update" == type):
            self.list[position] = value
        elif ("delete" == type):
            self.list.pop(position)

class OTServer:
    def __init__(self):
        self.clients = []
        self.order = 0
    def add(self, id):
        cl = OTClient(id)
        self.clients.append(cl)
        return cl
    def _op_common(self, cl, op):
        for i in range(len(self.clients)):
            at = self.clients[i]
            if (at == cl):
                continue
            at.remote(self.order, op)
        self.order += 1
    def insert(self, cl, pos, val):
        self._op_common(cl, cl.insert(pos, val))
    def update(self, cl, pos, val):
        self._op_common(cl, cl.update(pos, val))
    def delete(self, cl, pos):
        self._op_common(cl, cl.delete(pos))
    def _getId(self, cl):
        for i in range(len(self.clients)):
            if (self.clients[i].id == cl.id):
                return i
        raise Exeption("Id not found")
    def sync(self, cl):
        syncs = cl.ot.syncOutbound()
        for i in range(0, len(self.clients)):
            at = self.clients[i]
            if (at == cl):
                continue
            at.ot.syncInbound(self._getId(cl), syncs)

cls = []
ot = OTServer()
cls.append(ot.add(0))
cls.append(ot.add(1))
cls.append(ot.add(2))

ot.insert(cls[0], 0, "first")
ot.insert(cls[1], 0, "second")
ot.insert(cls[2], 0, "third")

ot.sync(cls[0])
ot.sync(cls[1])
ot.sync(cls[2])

cls[0].stop()
cls[1].stop()
cls[2].stop()

ot.delete(cls[1], 1)
ot.update(cls[2], 2, "fourth")
ot.insert(cls[0], 3, "last")

cls[0].start()
cls[1].start()
cls[2].start()

print cls[0].list
print cls[1].list
print cls[2].list

