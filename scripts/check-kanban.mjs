import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { records, context, functions as tasks } from "./check-task-handlers.mjs";
async function moduleAt(path) {
  const result=await build({entryPoints:[path],bundle:true,platform:"node",format:"esm",write:false});
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`);
}
const kanban=await moduleAt("convex/kanban.ts");
const model=await moduleAt("src/lib/kanban-model.ts");
const owner=context("kanban-owner"),foreign=context("kanban-foreign");
const now=Date.now(),future=new Date(now+86400000*3).toISOString().slice(0,10);
const base={title:"Board card",priority:"medium",schedule:{type:"flexible",dueDate:future},timezone:"UTC",subtasks:[{title:"Keep this step"}]};
const create=ctx=>tasks.create._handler(ctx,{...base,requestId:randomUUID()});
const a=await create(owner),b=await create(owner),other=await create(foreign);
async function move(ctx,args) {
  const snapshot=structuredClone([...records.entries()]);
  try{return await kanban.move._handler(ctx,args);}catch(error){records.clear();for(const pair of snapshot)records.set(...pair);throw error;}
}
await assert.rejects(()=>move(foreign,{id:a,from:"planned",to:"progress"}));
await assert.rejects(()=>move(context(null),{id:a,from:"planned",to:"progress"}));
await assert.rejects(()=>move(owner,{id:a,from:"planned",to:"carried"}));
await move(owner,{id:a,from:"planned",to:"progress"});
assert.equal(records.get(a).progress,"in_progress");
await move(owner,{id:b,from:"planned",to:"progress",beforeId:a});
assert.ok(records.get(b).boardPosition>records.get(a).boardPosition);
await move(owner,{id:b,from:"progress",to:"progress",afterId:a});
assert.ok(records.get(b).boardPosition<records.get(a).boardPosition);
await assert.rejects(()=>move(owner,{id:a,from:"progress",to:"planned",beforeId:other}));
await assert.rejects(()=>move(owner,{id:a,from:"planned",to:"completed"}));
const schedule=structuredClone(records.get(a).schedule);
await move(owner,{id:a,from:"progress",to:"completed"});
assert.equal(records.get(a).status,"completed");
assert.ok(records.get(a).completedAt>=now);
await move(owner,{id:a,from:"completed",to:"planned"});
assert.equal(records.get(a).progress,"not_started");
assert.equal(records.get(a).completedAt,undefined);
await move(owner,{id:a,from:"planned",to:"progress"});
assert.deepEqual(records.get(a).schedule,schedule);
assert.equal((await tasks.get._handler(owner,{id:a})).subtasks.length,1);
// System-managed carry comes from the shared day model, not a second status.
records.get(b).schedule={type:"flexible",dueDate:"2020-01-01"};
records.get(b).workDate="2020-01-01";
const before=await tasks.get._handler(owner,{id:b});
assert.equal(model.taskLane(before,now),"carried");
await move(owner,{id:b,from:"carried",to:"progress"});
const continued=await tasks.get._handler(owner,{id:b});
assert.equal(model.taskLane(continued,now),"progress");
assert.equal(continued.schedule.dueDate,"2020-01-01");
assert.equal(continued.workDate,"2020-01-01");
const filter={domain:"",priority:"all",date:"all",from:"",to:"",sort:"manual"};
assert.equal(model.filterTasks([continued],filter,now).length,1);
assert.equal(model.filterTasks([continued],{...filter,dueDate:"2020-01-01"},now).length,1);
assert.equal(model.filterTasks([continued],{...filter,dueDate:"2020-01-02"},now).length,0);
assert.equal(model.filterTasks([{...continued,schedule:{type:"fixed",startAt:now,endAt:now+3600000}}],{...filter,dueDate:"2020-01-01"},now).length,0);
assert.equal(model.filterTasks([continued],{...filter,priority:"high"},now).length,0);
assert.equal(model.filterTasks([continued],{...filter,date:"today"},now).length,1);
assert.equal(model.filterTasks([continued],{...filter,date:"overdue"},now).length,1);
assert.equal(model.filterTasks([continued],{...filter,date:"range",from:"2030-01-03",to:"2030-01-01"},now).length,0);
const audit=[...records.values()].filter(row=>row.taskId===a && row.eventType);
assert.ok(audit.some(row=>row.eventType==="task_completed"));
assert.ok(audit.some(row=>row.eventType==="task_reopened"));
assert.ok([...records.values()].some(row=>row.taskId===b && row.eventType==="task_reordered"));
console.log("PASS: Kanban owner guards, stale moves, invalid carried drops, atomic failure rollback, status transitions, completion/reopen timestamps, persisted reordering, continued work without deadline changes, combined filters, and activity history.");
