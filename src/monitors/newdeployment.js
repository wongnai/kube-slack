const EventEmitter = require('events');
const config = require('config');
const kube = require('../kube');

class DeploymentStatus extends EventEmitter{
  constructor(){
    super();
  }

  start(){
    setInterval(() => {
      this.check();
  }, config.get('interval'));

    return this;
  }

  async check(){
    let containers = await kube.getContainerStatuses();

    for(let item of containers){
      if(!item.image === global.image){
        continue;
      }

      if(!item.ready){
        continue;
      }

      this.emit('message', {
        fallback: `Container ${item.pod.metadata.namespace}/${item.pod.metadata.name}/${item.name} has deployed image ${item.image}`,
        color: 'good',
        title: `${item.pod.metadata.namespace}/${item.pod.metadata.name}/${item.name}`,
        text: `Container deployed image *${item.image}*`,
        mrkdwn_in: ['text'],
        _key: `${item.pod.metadata.name}/${item.name}`,
      });

      global.image = item.image;
    }
  }
}

module.exports = () => new DeploymentStatus().start();