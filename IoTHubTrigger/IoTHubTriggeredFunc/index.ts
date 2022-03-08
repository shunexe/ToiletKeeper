import { AzureFunction, Context } from "@azure/functions"
const Client = require('azure-iothub').Client;
const Message = require('azure-iot-common').Message;
// From IoTHub Shared access policy
const connectionString = '';
const targetDevice = '';
const serviceClient = Client.fromConnectionString(connectionString);
import {createConnection} from 'mysql2/promise';


type LidEvent = {type:'lid';isOpen:boolean;}
type LightEvent = {type:'light';isOn:boolean;}

type DeviceMessage = LidEvent | LightEvent
const IoTHubTrigger: AzureFunction = async function (context: Context, message:DeviceMessage): Promise<void> {
    context.log(`Eventhub trigger function called for message : ${JSON.stringify(message)}`);
    context.log(message)
    const config =
      {
          host: process.env['DB_HOST'],
          user: process.env['DB_USER_NAME'],
          password: process.env['DB_PASSWORD'],
          database: 'your_database_name',
          port: 3306,
          ssl : {
              rejectUnauthorized: false
          }
      };

    const conn = await createConnection(config);
    if(message.type==='lid'){
        context.log(message.isOpen)
        try{
            await conn.query(`insert into lid (isOpen) values (${message.isOpen})`)
        }catch (e){
            context.log(JSON.stringify(e))
        }finally {
            conn.end();
        }

        if(!message.isOpen){//when you close lid
          await serviceClient.open()
          context.log('Service client connected');
          const c2dMessage = new Message('lidClosed');
          c2dMessage.ack = 'full';
          c2dMessage.messageId = "My Message ID";
          context.log('Sending message: ' + c2dMessage.getData());
          await serviceClient.send(targetDevice, c2dMessage)
            .then((res)=>{
              context.log(JSON.stringify(res))
            })
        }

    }else{
        context.log(message.isOn)
        try{
            await conn.query(`insert into light (isOn) values (${message.isOn})`)
            if(!message.isOn){ //when you left bathroom
                //1. get last lid state
                const [records,] = await conn.query("select isOpen from lid order by id DESC limit 1")
                context.log(records)
                context.log(records[0].isOpen)
                const isOpenNow = records[0].isOpen
                //2. if it is open, send alert to device and desktop app
                if(isOpenNow){
                    await serviceClient.open()
                    context.log('Service client connected');
                    const c2dMessage = new Message('lidOpen');
                    c2dMessage.ack = 'full';
                    c2dMessage.messageId = "My Message ID";
                    context.log('Sending message: ' + c2dMessage.getData());
                    await serviceClient.send(targetDevice, c2dMessage)
                      .then((res)=>{
                          context.log(JSON.stringify(res))
                      })
                    context.bindings.signalRMessages = [{
                      target:'alert',
                      arguments:[{message:'the lid is open'}]
                    }]
                }
            }
        }catch (e){
            context.log(JSON.stringify(e))
        }finally{
            conn.end();
        }
    }
    context.done();
};

export default IoTHubTrigger;
