provider "aws" {
  region = "eu-west-2"

  # Make it faster by skipping something
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_credentials_validation = true
}

module "lambda_function" {
  source = "terraform-aws-modules/lambda/aws"

  function_name         = "goalscorer-automated-notifications"
  description           = "A lambda to send alerts"
  handler               = "index.handler"
  runtime               = "nodejs20.x"
  timeout               = 60
  source_path           = "../src"
  environment_variables = local.envs
  architectures         = ["arm64"]

  attach_policy_statements = true
  policy_statements = {
    parameter_store = {
      effect    = "Allow",
      actions   = ["ssm:GetParameters", "ssm:GetParameter", "ssm:GetParametersByPath", "ssm:PutParameter"],
      resources = ["arn:aws:ssm:eu-west-2:${data.aws_caller_identity.current.account_id}:parameter/${local.envs["PARAMETER_NAME"]}"]
    }
  }

  tags = {
    Name = "goalscorer-automated-notifications"
  }
}

resource "aws_ssm_parameter" "game_week" {
  name  = local.envs["PARAMETER_NAME"]
  type  = "String"
  value = "2"
}

