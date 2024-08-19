const {
  GetParameterCommand,
  PutParameterCommand,
  SSMClient,
} = require("@aws-sdk/client-ssm");

const client = new SSMClient({ region: process.env.REGION });

function getReadableTime(time) {
  const split_by_comma = time.split(",");
  const split_time_by_space = split_by_comma[1].split(" ");
  return { date: split_by_comma[0], time: split_time_by_space[1] };
}

const handler = async () => {
  const ssm_command = await client.send(
    new GetParameterCommand({
      Name: process.env.PARAMETER_NAME,
      WithDecryption: true,
    }),
  );
  const gameWeek = +ssm_command.Parameter.Value;

  const url =
    "https://footballapi.pulselive.com/football/fixtures?comps=1&teams=1,2,127,130,131,4,6,7,34,8,26,10,11,12,23,15,20,21,25,38&compSeasons=719&page=0&pageSize=20&sort=asc&statuses=U,L&altIds=true&fast=false";
  const fixtures_fetch = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Origin: "https://www.premierleague.com",
      Referer: "https://www.premierleague.com/",
    },
  });
  const fixtures = await fixtures_fetch.json();

  let first_kickoff = "";
  const sorted_fixtures = fixtures.content.filter(
    (item) => +item.gameweek.gameweek === gameWeek,
  );
  const pretty_fixtures = sorted_fixtures.map((fixture, index) => {
    if (index === 0) first_kickoff = getReadableTime(fixture.kickoff.label);
    const timing = getReadableTime(fixture.kickoff.label);
    return `${timing.date}, ${timing.time} ${fixture.teams[0].team.shortName} v ${fixture.teams[1].team.shortName}\n`;
  });

  const first_kickoff_split = first_kickoff.time.split(":");

  const top_text = `This is your Gameweek ${gameWeek} reminder.
The deadline is ${+first_kickoff_split[0] - 1}:${first_kickoff_split[1]} ${first_kickoff.date}.
As usual, make your selections via the website: https://www.goalscorer-challenge.co.uk`;

  const output = `${top_text}

${pretty_fixtures.join("")}`;

  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_API_KEY}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: process.env.CHAT_ID, text: output }),
    },
  );

  await client.send(
    new PutParameterCommand({
      Name: process.env.PARAMETER_NAME,
      Value: `${gameWeek + 1}`,
      Overwrite: true,
    }),
  );
};

module.exports = { handler };
